import { useEffect } from "react";
import { getConflictDetails } from "../api/healthCheck";
import { SELLER_ID } from "../constants";
import { useFetch } from "../hooks/useFetch";
import ErrorState from "./ErrorState";
import LoadingState from "./LoadingState";
import StatusBadge from "./StatusBadge";

const FIELD_LABELS = {
  sku: "SKU",
  barcode: "Barcode",
  product_id: "Product ID",
  variant_id: "Variant ID",
  inventory_item_id: "Inventory Item ID",
};

export default function ProductConflictModal({ variantId, onClose }) {
  const { data, loading, error } = useFetch(
    () => getConflictDetails(SELLER_ID, variantId),
    [variantId]
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-5 py-16"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-shopify-border px-6 py-5">
          <h3 className="text-[19px] font-semibold text-shopify-ink">Product Conflict Details</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-xl leading-none text-shopify-sub hover:text-shopify-ink"
          >
            &times;
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="px-6 py-6">
              <LoadingState label="Loading conflict details…" />
            </div>
          )}
          {error && (
            <div className="px-6 py-6">
              <ErrorState message={error.message} />
            </div>
          )}
          {data && (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <Th>Field</Th>
                  <Th>Current</Th>
                  <Th>Latest</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.fields.map((row) => (
                  <tr key={row.field}>
                    <Td className="font-semibold">{FIELD_LABELS[row.field] ?? row.field}</Td>
                    <Td>
                      {row.current === null ? <span className="italic text-slate-400">null</span> : row.current}
                    </Td>
                    <Td>{row.latest}</Td>
                    <Td>
                      <StatusBadge status={row.status} variant="solid" />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end border-t border-shopify-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-shopify-border-2 bg-white px-4 py-2 text-sm font-semibold text-shopify-ink-2 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-shopify-sub">
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return <td className={`px-6 py-4 text-shopify-ink-2 ${className}`}>{children}</td>;
}
