"use client";

import { useEffect, useState } from "react";

interface State<T> {
  url: string | null;
  data: T | null;
  error: string;
  updatedAt: number | null;
}

export interface PolledJson<T> {
  data: T | null;
  error: string;
  /** True until the first response (or error) for the current URL arrives. */
  loading: boolean;
  /** When the data was last fetched successfully (epoch ms). */
  updatedAt: number | null;
}

/**
 * Fetches JSON from `url` and, when `intervalMs` is set, refreshes it on that
 * interval. Refreshing pauses while the tab is hidden and resumes with an
 * immediate fetch when it becomes visible. Data from a previous URL is never
 * returned for a new one.
 */
export function usePolledJson<T>(
  url: string | null,
  intervalMs: number | null,
): PolledJson<T> {
  const [state, setState] = useState<State<T>>({
    url: null,
    data: null,
    error: "",
    updatedAt: null,
  });

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    let controller: AbortController | null = null;

    async function load() {
      controller?.abort();
      const current = new AbortController();
      controller = current;

      try {
        const response = await fetch(url as string, { signal: current.signal });
        const body = await response.json();
        if (cancelled) return;

        if (response.ok) {
          setState({ url, data: body as T, error: "", updatedAt: Date.now() });
        } else {
          const message =
            typeof body?.error === "string" ? body.error : "Request failed.";
          // Keep showing the last good data for this URL while retrying.
          setState((previous) => ({
            url,
            data: previous.url === url ? previous.data : null,
            error: message,
            updatedAt: previous.url === url ? previous.updatedAt : null,
          }));
        }
      } catch (error) {
        if (cancelled || (error as Error).name === "AbortError") return;
        setState((previous) => ({
          url,
          data: previous.url === url ? previous.data : null,
          error: "Network error. Retrying…",
          updatedAt: previous.url === url ? previous.updatedAt : null,
        }));
      }
    }

    load();

    const timer = intervalMs
      ? setInterval(() => {
          if (!document.hidden) load();
        }, intervalMs)
      : undefined;
    const onVisibilityChange = () => {
      if (!document.hidden && intervalMs) load();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      controller?.abort();
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [url, intervalMs]);

  const current = state.url === url;
  return {
    data: current ? state.data : null,
    error: current ? state.error : "",
    updatedAt: current ? state.updatedAt : null,
    loading:
      url !== null && (!current || (state.data === null && state.error === "")),
  };
}
