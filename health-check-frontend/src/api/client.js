const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * @param {string} path
 * @param {{method?: string, body?: unknown, raw?: boolean}} [options]
 *   `raw: true` resolves to a Blob instead of parsed JSON (for file downloads).
 */
export async function apiRequest(path, { method = "GET", body, raw = false } = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      `Could not reach the API at ${BASE_URL}. Is the backend running?`
    );
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const parsed = await res.json();
      detail = parsed.detail ?? detail;
    } catch {
      // response wasn't JSON — fall back to statusText
    }
    const error = new Error(
      typeof detail === "string" ? detail : detail?.message || `Request failed with status ${res.status}`
    );
    error.status = res.status;
    error.detail = detail;
    throw error;
  }

  return raw ? res.blob() : res.json();
}
