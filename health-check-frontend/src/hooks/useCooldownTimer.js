import { useEffect, useState } from "react";
import { parseServerDate } from "../utils/date";

/**
 * Ticks every second but always re-derives remaining seconds from the
 * server-provided `nextEligibleAtIso` timestamp, so a page reload mid-
 * cooldown shows the correct remaining time instead of resetting.
 */
export function useCooldownTimer(nextEligibleAtIso) {
  const computeRemaining = () => {
    if (!nextEligibleAtIso) return 0;
    const diffMs = parseServerDate(nextEligibleAtIso).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / 1000));
  };

  const [secondsRemaining, setSecondsRemaining] = useState(computeRemaining);

  useEffect(() => {
    setSecondsRemaining(computeRemaining());
    if (!nextEligibleAtIso) return undefined;

    const interval = setInterval(() => {
      setSecondsRemaining(computeRemaining());
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextEligibleAtIso]);

  return { secondsRemaining, isReady: secondsRemaining <= 0 };
}
