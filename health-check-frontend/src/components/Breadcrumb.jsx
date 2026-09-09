import { Link } from "react-router-dom";

export default function Breadcrumb({ items }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-shopify-sub" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={item.label} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
            )}
            {item.to && !isLast ? (
              <Link to={item.to} className="font-semibold text-shopify-blue hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-semibold text-shopify-ink" : ""}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
