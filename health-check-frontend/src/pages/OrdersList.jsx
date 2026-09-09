import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getOrders } from "../api/healthCheck";
import Breadcrumb from "../components/Breadcrumb";
import ErrorState from "../components/ErrorState";
import FilterChip from "../components/FilterChip";
import LoadingState from "../components/LoadingState";
import OrdersTable from "../components/OrdersTable";
import { AGE_BRACKETS, SELLER_ID } from "../constants";
import { useFetch } from "../hooks/useFetch";

export default function OrdersList() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bracket = searchParams.get("bracket") ?? "";
  const bracketInfo = AGE_BRACKETS.find((b) => b.bracket === bracket);

  const [reloadKey, setReloadKey] = useState(0);
  const retry = () => setReloadKey((n) => n + 1);

  const { data, loading, error } = useFetch(
    useCallback(() => getOrders(SELLER_ID, bracket), [bracket, reloadKey]),
    [bracket, reloadKey]
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Health check", to: "/" }, { label: "Orders" }]} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-shopify-ink">
            Pending, unfulfilled orders{bracketInfo ? ` — ${bracketInfo.label}` : ""}
          </h1>
          <p className="mt-1 text-[13px] text-shopify-sub">Orders requiring action in this age bracket</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="rounded-lg border border-shopify-border-2 bg-white px-4 py-2.5 text-[13px] font-semibold text-shopify-ink-2 hover:bg-slate-50"
        >
          &larr; Back to health check
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FilterChip label="Status: Pending · Unfulfilled" />
        <FilterChip label={`Age: ${bracketInfo?.label ?? bracket}`} removable onRemove={() => navigate("/")} />
        {data && (
          <span className="text-[13px] text-shopify-sub">{data.count} orders match this filter</span>
        )}
      </div>

      {loading && <LoadingState label="Loading orders…" />}
      {error && <ErrorState message={error.message} onRetry={retry} />}
      {data && <OrdersTable orders={data.orders} />}
    </div>
  );
}
