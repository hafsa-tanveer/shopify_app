"""
Seeds the SQLite database with dummy Shopify-style catalog/order data for one
seller so the Health Check Dashboard endpoints have something to serve.

Run with:
    python -m app.seed

Re-running this script drops and recreates all tables, so it doubles as a
reset/reseed tool.
"""

import random
from datetime import datetime, timedelta

from faker import Faker

from . import models
from .database import Base, SessionLocal, engine
from .services import health_metrics as hm

fake = Faker()
Faker.seed(42)
random.seed(42)

SELLER_ID = "seller_demo_001"
STORE_DOMAIN = "aurora-apparel.myshopify.com"
STORE_TIMEZONE = "America/New_York"

NUM_VARIANTS = 200
CONFLICT_RATE = 0.15
NUM_RESOLVED_CONFLICTS = 8
NUM_ORDERS = 150
NUM_NEEDING_ACTION_ORDERS = 45

PRODUCT_NAMES = [
    "Aurora Cotton Tee", "Nomad Denim Jacket", "Coastal Linen Shirt", "Terra Wool Sweater",
    "Solace Hoodie", "Vector Running Short", "Halo Puffer Vest", "Drift Chino Pant",
    "Ember Flannel", "Lumen Rain Shell", "Pulse Track Pant", "Cove Polo",
    "Meridian Bomber Jacket", "Summit Trail Backpack", "Cascade Fleece Pullover",
    "Amber Canvas Tote", "Ridge Cargo Short", "Willow Knit Dress", "Basin Utility Vest",
    "Quartz Graphic Tee", "Delta Windbreaker", "Sable Wool Beanie", "Harbor Chambray Shirt",
    "Ashland Corduroy Jacket", "Fjord Merino Sock",
]
VARIANT_COLORS = ["Black", "Navy", "Olive", "Sand", "Grey", "White", "Rust", "Slate", "Charcoal", "Cream"]
VARIANT_SIZES = ["XS", "S", "M", "L", "XL"]

# Weighted toward SKU/barcode being the most common conflict type, per the
# ticket's "meaningfully different magnitudes" expectation.
FIELD_WEIGHTS = {
    models.ConflictField.sku: 0.35,
    models.ConflictField.barcode: 0.30,
    models.ConflictField.product_id: 0.15,
    models.ConflictField.variant_id: 0.12,
    models.ConflictField.inventory_item_id: 0.08,
}

PENDING_UNFULFILLED_OTHER_FULFILLMENT = ["fulfilled", "partial", "delivered", "returned", "cancelled"]
PENDING_UNFULFILLED_OTHER_PAYMENT = ["paid", "refunded", "partially_refunded"]


def reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def make_sku() -> str:
    return f"SKU-{fake.bothify(text='??##-####').upper()}"


def make_barcode() -> str:
    return fake.ean13()


def make_numeric_id() -> str:
    return str(fake.random_int(min=100_000_000_000, max=999_999_999_999))


def make_variant_title() -> str:
    return f"{random.choice(VARIANT_COLORS)} / {random.choice(VARIANT_SIZES)}"


def drift_value(field: models.ConflictField, current_value: str) -> str:
    """Produce a plausible 'latest_value' that differs from current_value."""
    if field == models.ConflictField.sku:
        return make_sku()
    if field == models.ConflictField.barcode:
        return make_barcode()
    # product_id / variant_id / inventory_item_id are numeric Shopify GIDs
    return str(int(current_value) + random.randint(1, 999))


def eligible_conflict_fields(variant: models.Variant) -> tuple[list, list]:
    """Fields a variant can plausibly get a conflict on -- excludes any field
    whose live value is currently null (Conflict.current_value is NOT NULL)."""
    fields, weights = [], []
    for field, weight in FIELD_WEIGHTS.items():
        if getattr(variant, field.value) is None:
            continue
        fields.append(field)
        weights.append(weight)
    return fields, weights


def weighted_sample_without_replacement(items: list, weights: list, k: int) -> list:
    items, weights = list(items), list(weights)
    chosen = []
    for _ in range(min(k, len(items))):
        pick = random.choices(items, weights=weights, k=1)[0]
        idx = items.index(pick)
        chosen.append(items.pop(idx))
        weights.pop(idx)
    return chosen


def build_variants() -> list[models.Variant]:
    # Each product name maps to ONE stable product_id shared by all its
    # variants (Shopify's real model: product_id identifies the product,
    # multiple variants hang off it) -- otherwise every variant would look
    # like its own distinct product, which breaks the scan-status "N
    # variants across M products" figure.
    product_pool = [{"title": name, "product_id": make_numeric_id()} for name in PRODUCT_NAMES]

    variants = []
    for _ in range(NUM_VARIANTS):
        product = random.choice(product_pool)
        variants.append(
            models.Variant(
                product_title=product["title"],
                variant_title=make_variant_title(),
                sku=make_sku(),
                barcode=make_barcode(),
                product_id=product["product_id"],
                variant_id=make_numeric_id(),
                inventory_item_id=make_numeric_id(),
                inventory_policy=random.choices(
                    [models.InventoryPolicy.continue_, models.InventoryPolicy.deny],
                    weights=[0.12, 0.88],
                )[0],
                on_hand_qty=random.randint(0, 500),
                seller_id=SELLER_ID,
            )
        )
    return variants


def plant_duplicate_identifiers(variants: list[models.Variant]) -> tuple[set, set]:
    """Force ~4 disjoint groups of variants to share a barcode (~12 variants
    total); the first 2 of those groups also share a SKU, so
    duplicate_sku_barcode is a real, smaller subset of duplicate_barcode."""
    pool = list(variants)
    random.shuffle(pool)

    barcode_touched: set[int] = set()
    sku_touched: set[int] = set()
    idx = 0
    for i, size in enumerate([3, 2, 4, 3]):
        group = pool[idx : idx + size]
        idx += size
        shared_barcode = make_barcode()
        for v in group:
            v.barcode = shared_barcode
            barcode_touched.add(id(v))
        if i < 2:
            shared_sku = make_sku()
            for v in group:
                v.sku = shared_sku
                sku_touched.add(id(v))
    return barcode_touched, sku_touched


def plant_missing_identifiers(variants: list[models.Variant], already_touched: set) -> tuple[set, set]:
    """Force ~20 variants to have no barcode and ~12 to have no SKU, with a
    ~5-variant overlap so 'missing SKU & barcode' has a real count too."""
    candidates = [v for v in variants if id(v) not in already_touched]
    random.shuffle(candidates)

    missing_barcode = set(candidates[:20])
    for v in missing_barcode:
        v.barcode = None

    remaining = [v for v in candidates if v not in missing_barcode]
    random.shuffle(remaining)
    missing_sku = set(remaining[:7]) | set(random.sample(list(missing_barcode), 5))
    for v in missing_sku:
        v.sku = None

    return {id(v) for v in missing_barcode}, {id(v) for v in missing_sku}


def build_conflicts(variants: list[models.Variant]) -> tuple[list[models.Conflict], list[models.Variant]]:
    num_conflicted = max(1, round(NUM_VARIANTS * CONFLICT_RATE))
    conflicted_variants = random.sample(variants, num_conflicted)

    conflicts = []
    for variant in conflicted_variants:
        fields, weights = eligible_conflict_fields(variant)
        if not fields:
            continue
        num_fields = min(len(fields), random.choices([1, 2], weights=[0.8, 0.2])[0])
        for field in weighted_sample_without_replacement(fields, weights, num_fields):
            current_value = getattr(variant, field.value)
            latest_value = drift_value(field, current_value)
            conflicts.append(
                models.Conflict(
                    variant_id=variant.id,
                    field=field,
                    current_value=str(current_value),
                    latest_value=str(latest_value),
                    status=models.ConflictStatus.mismatch,
                    state=models.ConflictState.pending,
                    seller_id=SELLER_ID,
                )
            )

    # A handful of already-resolved conflicts on otherwise-clean variants, so
    # the state=pending filters in the API actually have something to filter out.
    conflicted_ids = {v.id for v in conflicted_variants}
    clean_variants = [v for v in variants if v.id not in conflicted_ids]
    resolved_sample = random.sample(clean_variants, min(NUM_RESOLVED_CONFLICTS, len(clean_variants)))
    for variant in resolved_sample:
        fields, weights = eligible_conflict_fields(variant)
        if not fields:
            continue
        field = random.choices(fields, weights=weights, k=1)[0]
        current_value = getattr(variant, field.value)
        latest_value = drift_value(field, current_value)
        conflicts.append(
            models.Conflict(
                variant_id=variant.id,
                field=field,
                current_value=str(current_value),
                latest_value=str(latest_value),
                status=models.ConflictStatus.matched,
                state=models.ConflictState.resolved,
                seller_id=SELLER_ID,
            )
        )

    return conflicts, conflicted_variants


def build_orders() -> list[models.Order]:
    orders = []

    # Orders needing action: pending payment + unfulfilled, age stratified
    # roughly evenly across the 3 aging brackets (rather than a uniform
    # 60-day spread, which would skew almost entirely into 11+).
    bracket_day_ranges = [(0, 3), (4, 10), (11, 26)]
    for i in range(NUM_NEEDING_ACTION_ORDERS):
        lo, hi = bracket_day_ranges[i % 3]
        placed_at = datetime.utcnow() - timedelta(
            days=random.randint(lo, hi), hours=random.randint(0, 23), minutes=random.randint(0, 59)
        )
        orders.append(
            models.Order(
                order_number=f"#{1000 + len(orders) + 1}",
                payment_status="pending",
                fulfillment_status="unfulfilled",
                total_amount=round(random.uniform(20, 500), 2),
                placed_at=placed_at,
                seller_id=SELLER_ID,
            )
        )

    # Everything else: a realistic mix that must be excluded from "needing
    # action" (fulfilled/delivered/returned/cancelled, or paid/refunded).
    for _ in range(NUM_ORDERS - NUM_NEEDING_ACTION_ORDERS):
        orders.append(
            models.Order(
                order_number=f"#{1000 + len(orders) + 1}",
                payment_status=random.choice(PENDING_UNFULFILLED_OTHER_PAYMENT),
                fulfillment_status=random.choice(PENDING_UNFULFILLED_OTHER_FULFILLMENT),
                total_amount=round(random.uniform(20, 500), 2),
                placed_at=fake.date_time_between(start_date="-60d", end_date="now"),
                seller_id=SELLER_ID,
            )
        )

    return orders


def build_order_variants(
    orders: list[models.Order], variants: list[models.Variant]
) -> list[models.OrderVariant]:
    order_variants = []
    for order in orders:
        num_items = random.randint(1, 5)
        chosen = random.sample(variants, num_items)
        for variant in chosen:
            order_variants.append(models.OrderVariant(order_id=order.id, variant_id=variant.id))
    return order_variants


def seed() -> None:
    reset_db()
    db = SessionLocal()
    try:
        variants = build_variants()
        barcode_touched, sku_touched = plant_duplicate_identifiers(variants)
        plant_missing_identifiers(variants, barcode_touched | sku_touched)

        db.add_all(variants)
        db.flush()  # assign variant ids

        conflicts, conflicted_variants = build_conflicts(variants)
        db.add_all(conflicts)

        orders = build_orders()
        db.add_all(orders)
        db.flush()  # assign order ids

        order_variants = build_order_variants(orders, variants)
        db.add_all(order_variants)

        db.add(
            models.StoreScanState(
                seller_id=SELLER_ID,
                store_domain=STORE_DOMAIN,
                timezone=STORE_TIMEZONE,
                last_scanned_at=None,
                products_scanned_count=0,
                variants_scanned_count=0,
            )
        )

        db.commit()

        pending_count = sum(1 for c in conflicts if c.state == models.ConflictState.pending)
        quality_counts = {
            key: len(hm.quality_variant_ids(db, SELLER_ID, key)) for key in hm.QUALITY_CHECKS
        }
        needing_action = hm.pending_unfulfilled_orders_query(db, SELLER_ID).all()
        now = datetime.utcnow()
        aging_counts = {"0-3": 0, "4-10": 0, "11+": 0}
        for order in needing_action:
            aging_counts[hm.age_bracket((now - order.placed_at).days)] += 1

        print(
            f"Seeded {len(variants)} variants, {len(conflicts)} conflicts "
            f"({pending_count} pending across {len(conflicted_variants)} variants), "
            f"{len(orders)} orders, {len(order_variants)} order_variant links "
            f"for seller_id={SELLER_ID!r}"
        )
        print(f"Quality-check counts: {quality_counts}")
        print(
            f"Orders needing action: {len(needing_action)} total "
            f"(0-3d: {aging_counts['0-3']}, 4-10d: {aging_counts['4-10']}, 11+d: {aging_counts['11+']})"
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()
