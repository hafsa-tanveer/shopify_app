from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict


class SummaryResponse(BaseModel):
    total_conflicts: int
    orders_affected: int
    inventory_units_affected: int
    orders_awaiting_action: int


class ConflictBreakdownItem(BaseModel):
    type: str
    count: int


class VariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_title: str
    variant_title: str
    sku: Optional[str]
    barcode: Optional[str]
    product_id: str
    variant_id: str
    inventory_item_id: str
    inventory_policy: str
    on_hand_qty: int
    seller_id: str


class ConflictVariantsResponse(BaseModel):
    type: str
    count: int
    variants: List[VariantOut]


class QualityBreakdownItem(BaseModel):
    type: str
    label: str
    count: int
    severity: Literal["high", "review"]


class VariantIssueOut(VariantOut):
    issue_reason: str


class QualityVariantsResponse(BaseModel):
    type: str
    count: int
    variants: List[VariantIssueOut]


class ImpactGroupItem(BaseModel):
    group: str
    label: str
    orders_affected: int
    inventory_units_affected: int


class ImpactResponse(BaseModel):
    orders_affected: int
    inventory_units_affected: int
    groups: List[ImpactGroupItem]


class AgingBracketItem(BaseModel):
    bracket: Literal["0-3", "4-10", "11+"]
    label: str
    count: int


class OrdersAgingResponse(BaseModel):
    total: int
    brackets: List[AgingBracketItem]


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_number: str
    placed_at: datetime
    age_days: int
    item_count: int
    total_amount: float
    payment_status: str
    fulfillment_status: str


class OrdersListResponse(BaseModel):
    bracket: str
    count: int
    orders: List[OrderOut]


class ConflictDetailItem(BaseModel):
    field: str
    current: Optional[str]
    latest: Optional[str]
    status: Literal["matched", "mismatch"]


class ProductConflictDetailsResponse(BaseModel):
    variant_id: int
    product_title: str
    variant_title: str
    fields: List[ConflictDetailItem]


class ScanStatusResponse(BaseModel):
    seller_id: str
    store_domain: str
    timezone: str
    last_scanned_at: Optional[datetime]
    products_scanned_count: int
    variants_scanned_count: int
    daily_scan_time_local: str
    cooldown_seconds_remaining: int
    next_manual_eligible_at: Optional[datetime]


class ScanTriggerResponse(ScanStatusResponse):
    pass
