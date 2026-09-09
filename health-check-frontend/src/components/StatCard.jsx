const COLOR_BY_VARIANT = {
  critical: "text-shopify-red",
  warning: "text-shopify-amber",
  plain: "text-shopify-ink",
};

export default function StatCard({ label, value, variant = "plain", footer }) {
  return (
    <div className="rounded-xl border border-shopify-border bg-shopify-card p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-shopify-sub">{label}</div>
      <div className={`mt-1.5 text-[34px] font-bold leading-none tracking-tight tabular-nums ${COLOR_BY_VARIANT[variant]}`}>
        {value}
      </div>
      {footer && <div className="mt-2 text-xs text-shopify-sub">{footer}</div>}
    </div>
  );
}
