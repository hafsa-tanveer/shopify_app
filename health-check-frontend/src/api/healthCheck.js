import { apiRequest } from "./client";

const qs = (params) =>
  Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

export function getSummary(sellerId) {
  return apiRequest(`/health-check/summary?${qs({ seller_id: sellerId })}`);
}

export function getConflictBreakdown(sellerId) {
  return apiRequest(`/health-check/conflicts/breakdown?${qs({ seller_id: sellerId })}`);
}

export function getConflictVariants(sellerId, type) {
  return apiRequest(`/health-check/conflicts/variants?${qs({ seller_id: sellerId, type })}`);
}

export function getConflictDetails(sellerId, variantId) {
  return apiRequest(
    `/health-check/conflicts/details?${qs({ seller_id: sellerId, variant_id: variantId })}`
  );
}

export function getQualityBreakdown(sellerId) {
  return apiRequest(`/health-check/quality/breakdown?${qs({ seller_id: sellerId })}`);
}

export function getQualityVariants(sellerId, type) {
  return apiRequest(`/health-check/quality/variants?${qs({ seller_id: sellerId, type })}`);
}

export function getImpact(sellerId) {
  return apiRequest(`/health-check/impact?${qs({ seller_id: sellerId })}`);
}

export function getOrdersAging(sellerId) {
  return apiRequest(`/health-check/orders/aging?${qs({ seller_id: sellerId })}`);
}

export function getOrders(sellerId, bracket) {
  return apiRequest(`/health-check/orders?${qs({ seller_id: sellerId, bracket })}`);
}

export function getScanStatus(sellerId) {
  return apiRequest(`/health-check/scan/status?${qs({ seller_id: sellerId })}`);
}

export function triggerScan(sellerId) {
  return apiRequest(`/health-check/scan?${qs({ seller_id: sellerId })}`, { method: "POST" });
}

export function getExportBlob(sellerId) {
  return apiRequest(`/health-check/export?${qs({ seller_id: sellerId })}`, { raw: true });
}
