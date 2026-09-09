import { useState } from "react";
import { getExportBlob } from "../api/healthCheck";
import { SELLER_ID } from "../constants";
import { useScan } from "../context/ScanContext";

export default function ExportButton() {
  const { showToast } = useScan();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    try {
      const blob = await getExportBlob(SELLER_ID);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `health-check-${SELLER_ID}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Report exported as CSV.");
    } catch (err) {
      showToast(err.message || "Export failed.");
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-lg border border-shopify-border-2 bg-white px-4 py-2.5 text-[13px] font-semibold text-shopify-ink-2 transition hover:bg-slate-50 disabled:opacity-60"
    >
      {pending ? "Exporting…" : "Export report"}
    </button>
  );
}
