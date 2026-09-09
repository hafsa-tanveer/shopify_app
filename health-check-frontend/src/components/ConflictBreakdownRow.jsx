import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

export default function ConflictBreakdownRow({ type, label, count }) {
  return (
    <Link
      to={`/products?type=${encodeURIComponent(type)}`}
      className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
    >
      <span className="h-2.5 w-2.5 flex-none rounded-full bg-shopify-red" aria-hidden="true" />
      <span className="flex-1 font-semibold text-shopify-ink">{label}</span>
      <StatusBadge status="mismatch" />
      <span className="min-w-16 text-right text-lg font-bold tabular-nums text-shopify-ink">{count}</span>
      <span className="min-w-30 text-right text-[12.5px] font-semibold text-shopify-blue">
        View products &rarr;
      </span>
    </Link>
  );
}
