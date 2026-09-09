export default function FilterChip({ label, removable = false, onRemove }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-shopify-border-2 bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-shopify-ink-2">
      {label}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove filter"
          className="font-bold text-shopify-sub hover:text-shopify-ink"
        >
          &times;
        </button>
      )}
    </span>
  );
}
