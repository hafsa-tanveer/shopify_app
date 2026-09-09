import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getScanStatus, triggerScan as triggerScanRequest } from "../api/healthCheck";
import { SELLER_ID } from "../constants";

const ScanContext = createContext(null);

export function ScanProvider({ children }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const refresh = useCallback(() => {
    setLoading(true);
    getScanStatus(SELLER_ID)
      .then((data) => {
        setStatus(data);
        setError(null);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const showToast = useCallback((message) => setToast(message), []);
  const dismissToast = useCallback(() => setToast(null), []);

  const triggerScan = useCallback(async () => {
    try {
      const data = await triggerScanRequest(SELLER_ID);
      setStatus(data);
      showToast(
        `Scanned ${data.variants_scanned_count} variants across ${data.products_scanned_count} products. Next scan available in 15 minutes.`
      );
      return data;
    } catch (err) {
      if (err.status === 429 && err.detail) {
        // Cooldown still active server-side -- sync local state to match
        // rather than guessing client-side.
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                cooldown_seconds_remaining: err.detail.seconds_remaining,
                next_manual_eligible_at: err.detail.next_eligible_at,
              }
            : prev
        );
        showToast(err.detail.message || "Scan already run recently.");
      } else {
        showToast(err.message || "Scan failed.");
      }
      throw err;
    }
  }, [showToast]);

  const value = { status, loading, error, refresh, triggerScan, toast, showToast, dismissToast };

  return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>;
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error("useScan must be used within a ScanProvider");
  return ctx;
}
