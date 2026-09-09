import { Link } from "react-router-dom";

export default function QualityTile({ type, label, description, count, severity }) {
  return (
    <Link
      to={`/products?type=${encodeURIComponent(type)}`}
      className="relative block rounded-xl border border-shopify-border bg-shopify-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span
        className={`absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-bold ${
          severity === "high" ? "bg-shopify-red-bg text-shopify-red" : "bg-shopify-amber-bg text-shopify-amber"
        }`}
      >
        {severity === "high" ? "HIGH" : "REVIEW"}
      </span>
      <div className="text-[30px] font-bold leading-none tracking-tight text-shopify-ink">{count}</div>
      <div className="mt-2 font-semibold text-shopify-ink">{label}</div>
      <div className="mt-1.5 min-h-8 text-[12.5px] text-shopify-sub">{description}</div>
      <div className="mt-2.5 text-[12.5px] font-semibold text-shopify-blue">View products &rarr;</div>
    </Link>
  );
}
