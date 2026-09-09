import enum

from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .database import Base


class InventoryPolicy(str, enum.Enum):
    continue_ = "continue"
    deny = "deny"


class ConflictField(str, enum.Enum):
    sku = "sku"
    barcode = "barcode"
    product_id = "product_id"
    variant_id = "variant_id"
    inventory_item_id = "inventory_item_id"


class ConflictStatus(str, enum.Enum):
    matched = "matched"
    mismatch = "mismatch"


class ConflictState(str, enum.Enum):
    pending = "pending"
    resolved = "resolved"


class Variant(Base):
    __tablename__ = "variants"

    id = Column(Integer, primary_key=True)
    product_title = Column(String, nullable=False)
    variant_title = Column(String, nullable=False)
    sku = Column(String, nullable=True)
    barcode = Column(String, nullable=True)
    product_id = Column(String, nullable=False)
    variant_id = Column(String, nullable=False)
    inventory_item_id = Column(String, nullable=False)
    inventory_policy = Column(Enum(InventoryPolicy), nullable=False, default=InventoryPolicy.deny)
    on_hand_qty = Column(Integer, nullable=False, default=0)
    seller_id = Column(String, nullable=False, index=True)

    conflicts = relationship("Conflict", back_populates="variant")


class Conflict(Base):
    __tablename__ = "conflicts"

    id = Column(Integer, primary_key=True)
    variant_id = Column(Integer, ForeignKey("variants.id"), nullable=False, index=True)
    field = Column(Enum(ConflictField), nullable=False, index=True)
    current_value = Column(String, nullable=False)
    latest_value = Column(String, nullable=False)
    status = Column(Enum(ConflictStatus), nullable=False, default=ConflictStatus.mismatch)
    state = Column(Enum(ConflictState), nullable=False, default=ConflictState.pending, index=True)
    seller_id = Column(String, nullable=False, index=True)

    variant = relationship("Variant", back_populates="conflicts")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    order_number = Column(String, nullable=False)
    payment_status = Column(String, nullable=False)
    fulfillment_status = Column(String, nullable=False)
    total_amount = Column(Float, nullable=False, default=0.0)
    placed_at = Column(DateTime, nullable=False)
    seller_id = Column(String, nullable=False, index=True)

    variants = relationship("Variant", secondary="order_variants")


class OrderVariant(Base):
    __tablename__ = "order_variants"

    order_id = Column(Integer, ForeignKey("orders.id"), primary_key=True)
    variant_id = Column(Integer, ForeignKey("variants.id"), primary_key=True)


class StoreScanState(Base):
    """One row per seller — tracks scan metadata for the app bar and the
    manual-scan 15-minute cooldown. `last_scanned_at` is shared by both the
    daily scheduled scan and manual triggers; it's the single source of
    truth for the cooldown gate."""

    __tablename__ = "store_scan_state"

    id = Column(Integer, primary_key=True)
    seller_id = Column(String, nullable=False, unique=True, index=True)
    store_domain = Column(String, nullable=False)
    timezone = Column(String, nullable=False)
    last_scanned_at = Column(DateTime, nullable=True)
    products_scanned_count = Column(Integer, nullable=False, default=0)
    variants_scanned_count = Column(Integer, nullable=False, default=0)
