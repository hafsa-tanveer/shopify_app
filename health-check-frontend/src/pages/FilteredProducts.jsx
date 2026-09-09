import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getConflictVariants, getQualityVariants } from "../api/healthCheck";
import Breadcrumb from "../components/Breadcrumb";
import ErrorState from "../components/ErrorState";
import FilterChip from "../components/FilterChip";
import LoadingState from "../components/LoadingState";
import ProductConflictModal from "../components/ProductConflictModal";
import VariantsTable from "../components/VariantsTable";
import { SELLER_ID, categoryForFilterType, labelForFilterType } from "../constants";
import { useFetch } from "../hooks/useFetch";

export default function FilteredProducts() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = searchParams.get("type") ?? "";
  const label = labelForFilterType(type);
  const category = categoryForFilterType(type);

  const [reloadKey, setReloadKey] = useState(0);
  const retry = () => setReloadKey((n) => n + 1);
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  const { data, loading, error } = useFetch(
    useCallback(
      () =>
        category === "quality"
          ? getQualityVariants(SELLER_ID, type)
          : getConflictVariants(SELLER_ID, type),
      [type, category, reloadKey]
    ),
    [type, category, reloadKey]
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Health check", to: "/" }, { label: "Products" }]} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-shopify-ink">Products</h1>
          <p className="mt-1 text-[13px] text-shopify-sub">
            {category === "quality" ? "Data quality" : "Conflict"} · showing affected variants
          </p>
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
        <FilterChip label={`Issue: ${label}`} removable onRemove={() => navigate("/")} />
        {data && (
          <span className="text-[13px] text-shopify-sub">{data.count} variants match this filter</span>
        )}
      </div>

      {loading && <LoadingState label="Loading affected variants…" />}
      {error && <ErrorState message={error.message} onRetry={retry} />}
      {data && (
        <VariantsTable variants={data.variants} category={category} onViewConflict={setSelectedVariantId} />
      )}

      {selectedVariantId !== null && (
        <ProductConflictModal variantId={selectedVariantId} onClose={() => setSelectedVariantId(null)} />
      )}
    </div>
  );
}
