export default function ImpactSummary({ ordersAffected, inventoryUnitsAffected }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-shopify-border bg-shopify-card p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-shopify-sub">Orders affected</div>
        <div className="mt-1.5 text-[30px] font-bold leading-none text-shopify-ink">{ordersAffected}</div>
      </div>
      <div className="rounded-xl border border-shopify-border bg-shopify-card p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-shopify-sub">
          Inventory units affected
        </div>
        <div className="mt-1.5 text-[30px] font-bold leading-none text-shopify-ink">
          {inventoryUnitsAffected.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
