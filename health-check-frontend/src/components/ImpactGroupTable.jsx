export default function ImpactGroupTable({ groups }) {
  return (
    <div className="overflow-hidden rounded-xl border border-shopify-border bg-shopify-card shadow-sm">
      <div className="grid grid-cols-[1fr_100px_140px] gap-2 bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-shopify-sub">
        <div>Conflict group</div>
        <div className="text-right">Orders</div>
        <div className="text-right">Inventory units</div>
      </div>
      {groups.map((group) => (
        <div
          key={group.group}
          className="grid grid-cols-[1fr_100px_140px] gap-2 border-t border-shopify-border px-5 py-3.5 text-[13.5px]"
        >
          <div className="text-shopify-ink">{group.label}</div>
          <div className="text-right font-bold text-shopify-ink">{group.orders_affected}</div>
          <div className="text-right font-bold text-shopify-ink">
            {group.inventory_units_affected.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
