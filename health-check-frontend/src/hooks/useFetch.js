import { useEffect, useState } from "react";

/**
 * Runs `fetcher` whenever `deps` changes, exposing loading/error state.
 * `fetcher` must be a stable-enough function (defined inline is fine, it's
 * re-invoked on every dep change, not on every render).
 */
export function useFetch(fetcher, deps) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, loading: false, error });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
