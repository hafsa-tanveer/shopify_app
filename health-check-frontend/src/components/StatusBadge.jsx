/**
 * `variant="chip"` (default) is the light pill used on breakdown rows.
 * `variant="solid"` is the filled pill used in the conflict-details modal.
 */
export default function StatusBadge({ status, variant = "chip" }) {
  const isMatch = status === "matched";
  const label = isMatch ? "MATCHED" : "MISMATCH";

  if (variant === "solid") {
    return (
      <span
        className={`inline-flex items-center rounded px-3 py-1 text-[11px] font-bold text-white ${
          isMatch ? "bg-shopify-green-badge" : "bg-shopify-red"
        }`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide ${
        isMatch ? "bg-shopify-green-badge/10 text-shopify-green-badge" : "bg-shopify-red-bg text-shopify-red"
      }`}
    >
      {label}
    </span>
  );
}
