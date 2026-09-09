import { useEffect } from "react";
import { useScan } from "../context/ScanContext";

export default function Toast() {
  const { toast, dismissToast } = useScan();

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = setTimeout(dismissToast, 4500);
    return () => clearTimeout(timeout);
  }, [toast, dismissToast]);

  if (!toast) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-shopify-ink px-5 py-3 text-sm font-semibold text-white shadow-lg"
    >
      {toast}
    </div>
  );
}
