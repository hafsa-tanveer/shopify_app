// Hardcoded for this pass — no auth / seller switching yet.
export const SELLER_ID = "seller_demo_001";

export const CONFLICT_TYPES = [
  { type: "sku_mismatch", label: "SKU Mismatch", category: "conflict" },
  { type: "barcode_mismatch", label: "Barcode Mismatch", category: "conflict" },
  { type: "product_id_mismatch", label: "Product ID Mismatch", category: "conflict" },
  { type: "variant_id_mismatch", label: "Variant ID Mismatch", category: "conflict" },
  { type: "inventory_item_id_mismatch", label: "Inventory Item ID Mismatch", category: "conflict" },
];

export const QUALITY_TYPES = [
  {
    type: "duplicate_barcode",
    label: "Duplicate barcodes",
    description: "Variants sharing a barcode with another variant.",
    severity: "review",
    category: "quality",
  },
  {
    type: "duplicate_sku_barcode",
    label: "Duplicate SKU & barcode",
    description: "Variants that duplicate both SKU and barcode.",
    severity: "high",
    category: "quality",
  },
  {
    type: "missing_barcode",
    label: "Missing barcode",
    description: "Variants with no barcode set.",
    severity: "review",
    category: "quality",
  },
  {
    type: "missing_sku",
    label: "Missing SKU",
    description: "Variants with no SKU set.",
    severity: "high",
    category: "quality",
  },
  {
    type: "missing_sku_barcode",
    label: "Missing SKU & barcode",
    description: "Variants missing both identifiers.",
    severity: "high",
    category: "quality",
  },
  {
    type: "continue_selling_oos",
    label: "Continue selling when out of stock",
    description: "Variants that keep selling past zero inventory.",
    severity: "high",
    category: "quality",
  },
];

export const AGE_BRACKETS = [
  { bracket: "0-3", label: "Up to 3 days", sub: "Recently placed, act soon", tone: "ok" },
  { bracket: "4-10", label: "4 to 10 days", sub: "Ageing — prioritise these", tone: "warn" },
  { bracket: "11+", label: "Over 10 days", sub: "Overdue — highest risk", tone: "crit" },
];

const ALL_FILTER_TYPES = [...CONFLICT_TYPES, ...QUALITY_TYPES];

export function labelForFilterType(type) {
  return ALL_FILTER_TYPES.find((t) => t.type === type)?.label ?? type;
}

export function categoryForFilterType(type) {
  return ALL_FILTER_TYPES.find((t) => t.type === type)?.category ?? "conflict";
}

export function descriptionForQualityType(type) {
  return QUALITY_TYPES.find((t) => t.type === type)?.description ?? "";
}

// Kept for any old callers — same as labelForFilterType.
export const labelForConflictType = labelForFilterType;
