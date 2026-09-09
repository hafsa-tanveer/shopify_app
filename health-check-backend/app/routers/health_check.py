import csv
import io
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..services import health_metrics as hm

router = APIRouter(prefix="/health-check", tags=["health-check"])

TYPE_TO_FIELD = {f"{field.value}_mismatch": field for field in models.ConflictField}

# label + severity shown on the dashboard tiles ("HIGH" red / "REVIEW" amber
# corner tags in the design mockup) -- a judgment call, the ticket doesn't
# define this split explicitly.
QUALITY_LABELS: dict[str, tuple[str, str]] = {
    "duplicate_barcode": ("Duplicate barcodes", "review"),
    "duplicate_sku_barcode": ("Duplicate SKU & barcode", "high"),
    "missing_barcode": ("Missing barcode", "review"),
    "missing_sku": ("Missing SKU", "high"),
    "missing_sku_barcode": ("Missing SKU & barcode", "high"),
    "continue_selling_oos": ("Continue selling when out of stock", "high"),
}

VALID_AGE_BRACKETS = {"0-3", "4-10", "11+"}
AGE_BRACKET_LABELS = {"0-3": "Up to 3 days", "4-10": "4 to 10 days", "11+": "Over 10 days"}


def _variant_issue_out(variant: models.Variant, issue_reason: str) -> schemas.VariantIssueOut:
    base = schemas.VariantOut.model_validate(variant)
    return schemas.VariantIssueOut(**base.model_dump(), issue_reason=issue_reason)


def _compute_conflict_breakdown(db: Session, seller_id: str) -> List[schemas.ConflictBreakdownItem]:
    rows = (
        db.query(models.Conflict.field, func.count(models.Conflict.id))
        .filter(
            models.Conflict.seller_id == seller_id,
            models.Conflict.state == models.ConflictState.pending,
        )
        .group_by(models.Conflict.field)
        .all()
    )
    counts = {field: count for field, count in rows}
    return [
        schemas.ConflictBreakdownItem(type=f"{field.value}_mismatch", count=counts.get(field, 0))
        for field in models.ConflictField
    ]


def _compute_quality_breakdown(db: Session, seller_id: str) -> List[schemas.QualityBreakdownItem]:
    return [
        schemas.QualityBreakdownItem(
            type=key,
            label=label,
            count=len(hm.quality_variant_ids(db, seller_id, key)),
            severity=severity,
        )
        for key, (label, severity) in QUALITY_LABELS.items()
    ]


def _compute_impact(db: Session, seller_id: str) -> schemas.ImpactResponse:
    conflicted = hm.conflicted_variant_ids(db, seller_id)
    gaps = hm.gap_variant_ids(db, seller_id)
    combined = conflicted | gaps
    orders_affected, inventory_units = hm.orders_and_inventory_for_variants(db, seller_id, combined)

    missing_ids = hm.quality_variant_ids(db, seller_id, "missing_barcode") | hm.quality_variant_ids(
        db, seller_id, "missing_sku"
    )
    duplicate_ids = hm.quality_variant_ids(db, seller_id, "duplicate_barcode") | hm.quality_variant_ids(
        db, seller_id, "duplicate_sku_barcode"
    )
    continue_ids = hm.quality_variant_ids(db, seller_id, "continue_selling_oos")

    # Each group below is computed independently (no cross-dedup) -- a
    # variant can belong to multiple groups, so these figures aren't
    # required to sum to the top-line orders_affected/inventory_units above.
    group_defs = [
        ("sku_barcode_mismatches", "SKU / Barcode mismatches", conflicted),
        ("missing_identifiers", "Missing identifiers", missing_ids),
        ("duplicate_identifiers", "Duplicate identifiers", duplicate_ids),
        ("continue_selling_oversell", "Continue-selling oversell", continue_ids),
    ]
    groups = []
    for key, label, ids in group_defs:
        o, u = hm.orders_and_inventory_for_variants(db, seller_id, ids)
        groups.append(
            schemas.ImpactGroupItem(group=key, label=label, orders_affected=o, inventory_units_affected=u)
        )

    return schemas.ImpactResponse(
        orders_affected=orders_affected, inventory_units_affected=inventory_units, groups=groups
    )


def _compute_orders_aging(db: Session, seller_id: str) -> schemas.OrdersAgingResponse:
    orders = hm.pending_unfulfilled_orders_query(db, seller_id).all()
    now = datetime.utcnow()
    counts = {"0-3": 0, "4-10": 0, "11+": 0}
    for order in orders:
        counts[hm.age_bracket((now - order.placed_at).days)] += 1
    brackets = [
        schemas.AgingBracketItem(bracket=b, label=AGE_BRACKET_LABELS[b], count=counts[b])
        for b in ("0-3", "4-10", "11+")
    ]
    return schemas.OrdersAgingResponse(total=len(orders), brackets=brackets)


@router.get("/summary", response_model=schemas.SummaryResponse)
def get_summary(seller_id: str = Query(...), db: Session = Depends(get_db)):
    total_conflicts = (
        db.query(models.Conflict)
        .filter(
            models.Conflict.seller_id == seller_id,
            models.Conflict.state == models.ConflictState.pending,
        )
        .count()
    )

    combined = hm.conflicted_variant_ids(db, seller_id) | hm.gap_variant_ids(db, seller_id)
    orders_affected, inventory_units_affected = hm.orders_and_inventory_for_variants(
        db, seller_id, combined
    )
    orders_awaiting_action = hm.pending_unfulfilled_orders_query(db, seller_id).count()

    return schemas.SummaryResponse(
        total_conflicts=total_conflicts,
        orders_affected=orders_affected,
        inventory_units_affected=inventory_units_affected,
        orders_awaiting_action=orders_awaiting_action,
    )


@router.get("/conflicts/breakdown", response_model=List[schemas.ConflictBreakdownItem])
def get_conflicts_breakdown(seller_id: str = Query(...), db: Session = Depends(get_db)):
    return _compute_conflict_breakdown(db, seller_id)


@router.get("/conflicts/variants", response_model=schemas.ConflictVariantsResponse)
def get_conflict_variants(
    seller_id: str = Query(...),
    type: str = Query(...),
    db: Session = Depends(get_db),
):
    field = TYPE_TO_FIELD.get(type)
    if field is None:
        valid_types = ", ".join(TYPE_TO_FIELD.keys())
        raise HTTPException(
            status_code=400,
            detail=f"Unknown conflict type '{type}'. Valid types: {valid_types}",
        )

    variant_ids = [
        row[0]
        for row in db.query(distinct(models.Conflict.variant_id))
        .filter(
            models.Conflict.seller_id == seller_id,
            models.Conflict.state == models.ConflictState.pending,
            models.Conflict.field == field,
        )
        .all()
    ]

    variants = (
        db.query(models.Variant).filter(models.Variant.id.in_(variant_ids)).all()
        if variant_ids
        else []
    )

    return schemas.ConflictVariantsResponse(type=type, count=len(variants), variants=variants)


@router.get("/quality/breakdown", response_model=List[schemas.QualityBreakdownItem])
def get_quality_breakdown(seller_id: str = Query(...), db: Session = Depends(get_db)):
    return _compute_quality_breakdown(db, seller_id)


@router.get("/quality/variants", response_model=schemas.QualityVariantsResponse)
def get_quality_variants(
    seller_id: str = Query(...),
    type: str = Query(...),
    db: Session = Depends(get_db),
):
    if type not in QUALITY_LABELS:
        valid_types = ", ".join(QUALITY_LABELS.keys())
        raise HTTPException(
            status_code=400,
            detail=f"Unknown quality-check type '{type}'. Valid types: {valid_types}",
        )

    label, _severity = QUALITY_LABELS[type]
    ids = hm.quality_variant_ids(db, seller_id, type)
    variants = db.query(models.Variant).filter(models.Variant.id.in_(ids)).all() if ids else []
    issue_variants = [_variant_issue_out(v, label) for v in variants]

    return schemas.QualityVariantsResponse(type=type, count=len(issue_variants), variants=issue_variants)


@router.get("/impact", response_model=schemas.ImpactResponse)
def get_impact(seller_id: str = Query(...), db: Session = Depends(get_db)):
    return _compute_impact(db, seller_id)


@router.get("/orders/aging", response_model=schemas.OrdersAgingResponse)
def get_orders_aging(seller_id: str = Query(...), db: Session = Depends(get_db)):
    return _compute_orders_aging(db, seller_id)


@router.get("/orders", response_model=schemas.OrdersListResponse)
def get_orders(
    seller_id: str = Query(...),
    bracket: str = Query(...),
    db: Session = Depends(get_db),
):
    if bracket not in VALID_AGE_BRACKETS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown bracket '{bracket}'. Valid brackets: {', '.join(sorted(VALID_AGE_BRACKETS))}",
        )

    now = datetime.utcnow()
    matched: List[schemas.OrderOut] = []
    for order in hm.pending_unfulfilled_orders_query(db, seller_id).all():
        age_days = (now - order.placed_at).days
        if hm.age_bracket(age_days) != bracket:
            continue
        matched.append(
            schemas.OrderOut(
                id=order.id,
                order_number=order.order_number,
                placed_at=order.placed_at,
                age_days=age_days,
                item_count=len(order.variants),
                total_amount=order.total_amount,
                payment_status=order.payment_status,
                fulfillment_status=order.fulfillment_status,
            )
        )
    matched.sort(key=lambda o: o.age_days, reverse=True)

    return schemas.OrdersListResponse(bracket=bracket, count=len(matched), orders=matched)


@router.get("/conflicts/details", response_model=schemas.ProductConflictDetailsResponse)
def get_conflict_details(
    seller_id: str = Query(...),
    variant_id: int = Query(...),
    db: Session = Depends(get_db),
):
    variant = (
        db.query(models.Variant)
        .filter(models.Variant.id == variant_id, models.Variant.seller_id == seller_id)
        .first()
    )
    if variant is None:
        raise HTTPException(
            status_code=404, detail=f"Variant {variant_id} not found for seller '{seller_id}'"
        )

    pending = (
        db.query(models.Conflict)
        .filter(
            models.Conflict.variant_id == variant_id,
            models.Conflict.seller_id == seller_id,
            models.Conflict.state == models.ConflictState.pending,
        )
        .all()
    )
    by_field = {c.field: c for c in pending}

    fields = []
    for field in models.ConflictField:
        current = getattr(variant, field.value)
        conflict = by_field.get(field)
        if conflict:
            fields.append(
                schemas.ConflictDetailItem(
                    field=field.value, current=current, latest=conflict.latest_value, status="mismatch"
                )
            )
        else:
            fields.append(
                schemas.ConflictDetailItem(field=field.value, current=current, latest=current, status="matched")
            )

    return schemas.ProductConflictDetailsResponse(
        variant_id=variant.id,
        product_title=variant.product_title,
        variant_title=variant.variant_title,
        fields=fields,
    )


@router.get("/export")
def export_report(seller_id: str = Query(...), db: Session = Depends(get_db)):
    conflict_breakdown = _compute_conflict_breakdown(db, seller_id)
    quality_breakdown = _compute_quality_breakdown(db, seller_id)
    impact = _compute_impact(db, seller_id)
    aging = _compute_orders_aging(db, seller_id)

    buffer = io.StringIO()
    writer = csv.writer(buffer)

    writer.writerow(["Store Health Check Report"])
    writer.writerow(["Seller ID", seller_id])
    writer.writerow(["Generated", datetime.utcnow().isoformat()])
    writer.writerow([])

    writer.writerow(["Conflict type", "Count"])
    for item in conflict_breakdown:
        writer.writerow([item.type, item.count])
    writer.writerow([])

    writer.writerow(["Variant data quality", "Count"])
    for item in quality_breakdown:
        writer.writerow([item.label, item.count])
    writer.writerow([])

    writer.writerow(["Impact group", "Orders", "Inventory units"])
    for group in impact.groups:
        writer.writerow([group.label, group.orders_affected, group.inventory_units_affected])
    writer.writerow([])

    writer.writerow(["Orders needing action (pending & unfulfilled)", "Count"])
    for bracket in aging.brackets:
        writer.writerow([bracket.label, bracket.count])

    buffer.seek(0)
    filename = f"health-check-{seller_id}-{datetime.utcnow():%Y%m%d}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
