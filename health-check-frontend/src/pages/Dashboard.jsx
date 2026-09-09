import { useCallback, useState } from "react";
import {
  getConflictBreakdown,
  getImpact,
  getOrdersAging,
  getQualityBreakdown,
  getSummary,
} from "../api/healthCheck";
import AgingCard from "../components/AgingCard";
import ConflictBreakdownRow from "../components/ConflictBreakdownRow";
import ErrorState from "../components/ErrorState";
import ExportButton from "../components/ExportButton";
import ImpactGroupTable from "../components/ImpactGroupTable";
import ImpactSummary from "../components/ImpactSummary";
import LoadingState from "../components/LoadingState";
import QualityTile from "../components/QualityTile";
import ScanButton from "../components/ScanButton";
import StatCard from "../components/StatCard";
import StatusSummaryBanner from "../components/StatusSummaryBanner";
import { AGE_BRACKETS, SELLER_ID, descriptionForQualityType, labelForFilterType } from "../constants";
import { useScan } from "../context/ScanContext";
import { useFetch } from "../hooks/useFetch";
import { parseServerDate } from "../utils/date";

export default function Dashboard() {
  const [reloadKey, setReloadKey] = useState(0);
  const retry = () => setReloadKey((n) => n + 1);
  const { status: scanStatus } = useScan();

  const summary = useFetch(useCallback(() => getSummary(SELLER_ID), [reloadKey]), [reloadKey]);
  const breakdown = useFetch(
    useCallback(() => getConflictBreakdown(SELLER_ID), [reloadKey]),
    [reloadKey]
  );
  const quality = useFetch(useCallback(() => getQualityBreakdown(SELLER_ID), [reloadKey]), [reloadKey]);
  const impact = useFetch(useCallback(() => getImpact(SELLER_ID), [reloadKey]), [reloadKey]);
  const aging = useFetch(useCallback(() => getOrdersAging(SELLER_ID), [reloadKey]), [reloadKey]);

  const scanMeta = !scanStatus
    ? "Loading scan status…"
    : scanStatus.last_scanned_at
      ? `Seller ID: ${SELLER_ID} · Scanned ${scanStatus.variants_scanned_count} variants across ` +
        `${scanStatus.products_scanned_count} products · Last scanned today at ` +
        `${parseServerDate(scanStatus.last_scanned_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ` +
        `Auto-scan runs daily at ${scanStatus.daily_scan_time_local} store-local time`
      : `Seller ID: ${SELLER_ID} · Not scanned yet · Auto-scan runs daily at ` +
        `${scanStatus.daily_scan_time_local} store-local time`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-shopify-ink">Store Health Check</h1>
          <p className="mt-1 text-[13px] text-shopify-sub">{scanMeta}</p>
        </div>
        <div className="flex gap-2.5">
          <ExportButton />
          <ScanButton />
        </div>
      </div>

      {summary.loading && <LoadingState label="Loading summary…" />}
      {summary.error && <ErrorState message={summary.error.message} onRetry={retry} />}
      {summary.data && (
        <StatusSummaryBanner
          totalConflicts={summary.data.total_conflicts}
          ordersAffected={summary.data.orders_affected}
          ordersAwaitingAction={summary.data.orders_awaiting_action}
        />
      )}

      {summary.data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total conflicts"
            value={summary.data.total_conflicts}
            variant="critical"
            footer="Across 5 conflict types"
          />
          <StatCard
            label="Orders affected"
            value={summary.data.orders_affected}
            variant="warning"
            footer="Orders touching conflicted or gap variants"
          />
          <StatCard
            label="Inventory units affected"
            value={summary.data.inventory_units_affected.toLocaleString()}
            footer="Units on conflicted or gap variants"
          />
        </div>
      )}

      <section>
        <h3 className="text-[15px] font-bold text-shopify-ink">Conflict breakdown</h3>
        <p className="mt-1 text-[13px] text-shopify-sub">
          Conflicts are fetched from Firaasa for this <b>Seller ID ({SELLER_ID})</b> and reflect records
          currently in a <b>pending</b> state. Click a type to view the affected products.
        </p>
        <div className="mt-3.5">
          {breakdown.loading && <LoadingState label="Loading breakdown…" />}
          {breakdown.error && <ErrorState message={breakdown.error.message} onRetry={retry} />}
          {breakdown.data && (
            <div className="divide-y divide-slate-100 rounded-xl border border-shopify-border bg-shopify-card shadow-sm">
              {breakdown.data.map((item) => (
                <ConflictBreakdownRow
                  key={item.type}
                  type={item.type}
                  label={labelForFilterType(item.type)}
                  count={item.count}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-[15px] font-bold text-shopify-ink">Variant data quality</h3>
        <p className="mt-1 text-[13px] text-shopify-sub">
          Catalog gaps and risky settings at the variant level. Click any tile to open Products filtered
          to those variants.
        </p>
        <div className="mt-3.5">
          {quality.loading && <LoadingState label="Loading data quality checks…" />}
          {quality.error && <ErrorState message={quality.error.message} onRetry={retry} />}
          {quality.data && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quality.data.map((item) => (
                <QualityTile
                  key={item.type}
                  type={item.type}
                  label={item.label}
                  count={item.count}
                  severity={item.severity}
                  description={descriptionForQualityType(item.type)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-[15px] font-bold text-shopify-ink">Order &amp; inventory impact</h3>
        <p className="mt-1 text-[13px] text-shopify-sub">
          How much of your business is exposed to the conflicts and gaps above.
        </p>
        <div className="mt-3.5">
          {impact.loading && <LoadingState label="Loading impact…" />}
          {impact.error && <ErrorState message={impact.error.message} onRetry={retry} />}
          {impact.data && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
              <ImpactSummary
                ordersAffected={impact.data.orders_affected}
                inventoryUnitsAffected={impact.data.inventory_units_affected}
              />
              <ImpactGroupTable groups={impact.data.groups} />
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-[15px] font-bold text-shopify-ink">Orders needing action</h3>
        <p className="mt-1 text-[13px] text-shopify-sub">
          Only <b>pending &amp; unfulfilled</b> orders are shown — the ones that need action. Fulfilled,
          delivered and returned orders are excluded. Click a bracket to open those orders.
        </p>
        <div className="mt-3.5">
          {aging.loading && <LoadingState label="Loading orders needing action…" />}
          {aging.error && <ErrorState message={aging.error.message} onRetry={retry} />}
          {aging.data && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {AGE_BRACKETS.map((bracket) => {
                  const match = aging.data.brackets.find((b) => b.bracket === bracket.bracket);
                  return (
                    <AgingCard
                      key={bracket.bracket}
                      bracket={bracket.bracket}
                      label={bracket.label}
                      sub={bracket.sub}
                      tone={bracket.tone}
                      count={match?.count ?? 0}
                    />
                  );
                })}
              </div>
              <div className="mt-3.5 rounded-lg border border-[#d3e0f2] bg-[#eef4fb] px-4 py-3 text-[12.5px] text-[#1f3a5f]">
                <b>{aging.data.total} orders</b> are pending and unfulfilled in total. Anything in the{" "}
                <b>Over 10 days</b> bracket is at highest risk of cancellation or chargeback.
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
