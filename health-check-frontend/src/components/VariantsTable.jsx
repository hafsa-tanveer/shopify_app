export default function VariantsTable({ variants, category, onViewConflict }) {
  if (variants.length === 0) {
    return (
      <div className="rounded-lg border border-shopify-border bg-shopify-card px-4 py-10 text-center text-sm text-shopify-sub">
        No variants match this filter.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-shopify-border bg-shopify-card shadow-sm">
      <table className="min-w-full divide-y divide-shopify-border text-sm">
        <thead className="bg-slate-50">
          <tr>
            <Th>Product / Variant</Th>
            <Th>SKU</Th>
            <Th>Barcode</Th>
            <Th>Issue</Th>
            <Th align="right">Inventory</Th>
            <Th />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {variants.map((variant) => (
            <tr key={variant.id} className="hover:bg-slate-50">
              <Td>
                <span className="mr-2.5 inline-block h-8 w-8 rounded-md bg-slate-200 align-middle" aria-hidden="true" />
                <span className="font-semibold text-shopify-ink">{variant.product_title}</span>{" "}
                <span className="text-shopify-sub">&mdash; {variant.variant_title}</span>
              </Td>
              <Td mono>
                {variant.sku ?? <span className="italic text-slate-400">null</span>}
              </Td>
              <Td mono>
                {variant.barcode ?? <span className="italic text-slate-400">null</span>}
              </Td>
              <Td>
                <span
                  className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                    category === "conflict"
                      ? "bg-shopify-red-bg text-shopify-red"
                      : "bg-shopify-amber-bg text-shopify-amber"
                  }`}
                >
                  {category === "conflict" ? "Mismatch" : variant.issue_reason}
                </span>
              </Td>
              <Td align="right" mono>
                {variant.on_hand_qty}
              </Td>
              <Td align="right">
                {category === "conflict" ? (
                  <button
                    type="button"
                    onClick={() => onViewConflict?.(variant.id)}
                    className="font-semibold text-shopify-blue hover:underline"
                  >
                    View conflict details
                  </button>
                ) : (
                  <span
                    className="cursor-not-allowed font-semibold text-slate-400"
                    title="Editing variants isn't available in this release"
                  >
                    Edit variant
                  </span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-shopify-sub ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left", mono = false }) {
  return (
    <td
      className={`whitespace-nowrap px-4 py-3 text-shopify-ink-2 ${
        align === "right" ? "text-right" : "text-left"
      } ${mono ? "font-mono text-xs" : ""}`}
    >
      {children}
    </td>
  );
}
