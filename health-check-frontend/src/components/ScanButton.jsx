import { useState } from "react";
import { useScan } from "../context/ScanContext";
import { useCooldownTimer } from "../hooks/useCooldownTimer";

function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ScanButton() {
  const { status, triggerScan } = useScan();
  const [pending, setPending] = useState(false);
  const { secondsRemaining, isReady } = useCooldownTimer(status?.next_manual_eligible_at);

  const disabled = pending || !status || !isReady;

  const handleClick = async () => {
    setPending(true);
    try {
      await triggerScan();
    } catch {
      // toast already shown by ScanContext
    } finally {
      setPending(false);
    }
  };

  let label = "Scan now";
  if (!isReady && status) label = `Scan in ${formatCountdown(secondsRemaining)}`;
  else if (pending) label = "Scanning…";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="rounded-lg bg-shopify-green px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-shopify-green-hover disabled:cursor-not-allowed disabled:bg-[#9bbfb3]"
    >
      {label}
    </button>
  );
}
