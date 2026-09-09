import { Link } from "react-router-dom";

const TONE_BORDER = {
  ok: "border-l-shopify-green",
  warn: "border-l-shopify-amber",
  crit: "border-l-shopify-red",
};

export default function AgingCard({ bracket, label, sub, count, tone }) {
  return (
    <Link
      to={`/orders?bracket=${encodeURIComponent(bracket)}`}
      className={`block rounded-xl border border-l-4 border-shopify-border bg-shopify-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${TONE_BORDER[tone]}`}
    >
      <div className="text-[30px] font-bold leading-none text-shopify-ink">{count}</div>
      <div className="mt-2 font-semibold text-shopify-ink">{label}</div>
      <div className="mt-1 text-[12.5px] text-shopify-sub">{sub}</div>
      <div className="mt-2.5 text-[12.5px] font-semibold text-shopify-blue">View orders &rarr;</div>
    </Link>
  );
}
