"""
Shared query helpers for the health-check metrics. Single source of truth
reused by /summary, /impact, /export, and the quality-check endpoints so the
definition of "conflicted" / "gap" variant never drifts between them.
"""

from typing import Callable, Literal

from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from .. import models

AgeBracket = Literal["0-3", "4-10", "11+"]


def conflicted_variant_ids(db: Session, seller_id: str) -> set[int]:
    rows = (
        db.query(distinct(models.Conflict.variant_id))
        .filter(
            models.Conflict.seller_id == seller_id,
            models.Conflict.state == models.ConflictState.pending,
        )
        .all()
    )
    return {r[0] for r in rows}


def _duplicate_barcode_ids(db: Session, seller_id: str) -> set[int]:
    dup_barcodes = (
        db.query(models.Variant.barcode)
        .filter(models.Variant.seller_id == seller_id, models.Variant.barcode.isnot(None))
        .group_by(models.Variant.barcode)
        .having(func.count(models.Variant.id) >= 2)
        .subquery()
    )
    rows = (
        db.query(models.Variant.id)
        .filter(
            models.Variant.seller_id == seller_id,
            models.Variant.barcode.in_(db.query(dup_barcodes.c.barcode)),
        )
        .all()
    )
    return {r[0] for r in rows}


def _duplicate_sku_ids(db: Session, seller_id: str) -> set[int]:
    dup_skus = (
        db.query(models.Variant.sku)
        .filter(models.Variant.seller_id == seller_id, models.Variant.sku.isnot(None))
        .group_by(models.Variant.sku)
        .having(func.count(models.Variant.id) >= 2)
        .subquery()
    )
    rows = (
        db.query(models.Variant.id)
        .filter(
            models.Variant.seller_id == seller_id,
            models.Variant.sku.in_(db.query(dup_skus.c.sku)),
        )
        .all()
    )
    return {r[0] for r in rows}


def _duplicate_sku_barcode_ids(db: Session, seller_id: str) -> set[int]:
    # Intentional AND-refinement of the two duplicate checks above, not a
    # disjoint bucket — see health-check-backend plan notes on overlap.
    return _duplicate_barcode_ids(db, seller_id) & _duplicate_sku_ids(db, seller_id)


def _missing_barcode_ids(db: Session, seller_id: str) -> set[int]:
    rows = (
        db.query(models.Variant.id)
        .filter(models.Variant.seller_id == seller_id, models.Variant.barcode.is_(None))
        .all()
    )
    return {r[0] for r in rows}


def _missing_sku_ids(db: Session, seller_id: str) -> set[int]:
    rows = (
        db.query(models.Variant.id)
        .filter(models.Variant.seller_id == seller_id, models.Variant.sku.is_(None))
        .all()
    )
    return {r[0] for r in rows}


def _missing_sku_barcode_ids(db: Session, seller_id: str) -> set[int]:
    # Intentional AND-refinement, subset of both missing checks above.
    return _missing_barcode_ids(db, seller_id) & _missing_sku_ids(db, seller_id)


def _continue_selling_oos_ids(db: Session, seller_id: str) -> set[int]:
    rows = (
        db.query(models.Variant.id)
        .filter(
            models.Variant.seller_id == seller_id,
            models.Variant.inventory_policy == models.InventoryPolicy.continue_,
        )
        .all()
    )
    return {r[0] for r in rows}


QUALITY_CHECKS: dict[str, Callable[[Session, str], set[int]]] = {
    "duplicate_barcode": _duplicate_barcode_ids,
    "duplicate_sku_barcode": _duplicate_sku_barcode_ids,
    "missing_barcode": _missing_barcode_ids,
    "missing_sku": _missing_sku_ids,
    "missing_sku_barcode": _missing_sku_barcode_ids,
    "continue_selling_oos": _continue_selling_oos_ids,
}


def quality_variant_ids(db: Session, seller_id: str, check_key: str) -> set[int]:
    fn = QUALITY_CHECKS.get(check_key)
    return fn(db, seller_id) if fn else set()


def gap_variant_ids(db: Session, seller_id: str) -> set[int]:
    """Union across all 6 quality checks."""
    ids: set[int] = set()
    for fn in QUALITY_CHECKS.values():
        ids |= fn(db, seller_id)
    return ids


def orders_and_inventory_for_variants(
    db: Session, seller_id: str, variant_ids: set[int]
) -> tuple[int, int]:
    if not variant_ids:
        return 0, 0

    orders_affected = (
        db.query(func.count(distinct(models.OrderVariant.order_id)))
        .join(models.Order, models.Order.id == models.OrderVariant.order_id)
        .filter(
            models.OrderVariant.variant_id.in_(variant_ids),
            models.Order.seller_id == seller_id,
        )
        .scalar()
    ) or 0

    inventory_units = (
        db.query(func.coalesce(func.sum(models.Variant.on_hand_qty), 0))
        .filter(
            models.Variant.id.in_(variant_ids),
            models.Variant.seller_id == seller_id,
        )
        .scalar()
    ) or 0

    return orders_affected, inventory_units


def pending_unfulfilled_orders_query(db: Session, seller_id: str):
    return db.query(models.Order).filter(
        models.Order.seller_id == seller_id,
        models.Order.payment_status == "pending",
        models.Order.fulfillment_status == "unfulfilled",
    )


def age_bracket(days: int) -> AgeBracket:
    if days <= 3:
        return "0-3"
    if days <= 10:
        return "4-10"
    return "11+"
