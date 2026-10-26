"use client";

import { useEffect, useState } from "react";
import { PriceAlerts } from "@/components/market/price-alerts";
import { PriceChart } from "@/components/market/price-chart";
import {
  DEFAULT_SYMBOL,
  getWatchName,
  WATCH_LISTS,
  type WatchListId,
} from "@/data/market-lists";
import { usePolledJson } from "@/hooks/use-polled-json";
import { useI18n } from "@/i18n/provider";
import { useFormatters } from "@/i18n/use-formatters";
import {
  canConvert,
  convertChart,
  convertQuote,
  DISPLAY_OPTIONS,
  type DisplayCurrency,
} from "@/lib/currency-convert";
import {
  type ChartData,
  dayChange,
  isValidSymbol,
  type Quote,
  RANGES,
  type RangeId,
  type SearchResult,
} from "@/lib/market-data";
import {
  ARROWS,
  type Direction,
  decimalsFor,
  directionOf,
} from "@/lib/market-format";

interface OverviewResponse {
  list: WatchListId;
  items: { symbol: string; name: string; quote: Quote | null }[];
}

interface SearchResponse {
  results: SearchResult[];
}

const CHART_REFRESH_MS = 20_000;
const OVERVIEW_REFRESH_MS = 30_000;
const SEARCH_DEBOUNCE_MS = 300;

const DIRECTION_COLOR: Record<Direction, string> = {
  up: "text-up",
  down: "text-down",
  flat: "text-muted",
};

function formatClock(ms: number | null, locale: string): string {
  return ms === null
    ? "—"
    : new Date(ms).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
}

function ChangeBadge({
  change,
  percent,
  decimals,
  compact = false,
}: {
  change: number | null;
  percent: number | null;
  decimals: number;
  /** Show only the percentage (used where space is tight). */
  compact?: boolean;
}) {
  const { formatPercent, formatSigned } = useFormatters();
  if (change === null || percent === null) {
    return <span className="text-muted">—</span>;
  }
  const direction = directionOf(change);
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap font-semibold ${DIRECTION_COLOR[direction]}`}
    >
      <span aria-hidden="true" className="text-[0.7em]">
        {ARROWS[direction]}
      </span>
      <span>
        {compact
          ? formatPercent(percent)
          : `${formatSigned(change, decimals)} (${formatPercent(percent)})`}
      </span>
    </span>
  );
}

function SearchBox({ onSelect }: { onSelect: (symbol: string) => void }) {
  const { t, tError } = useI18n();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(
      () => setDebounced(query.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [query]);

  const searching = debounced.length >= 2;
  const search = usePolledJson<SearchResponse>(
    searching ? `/api/markets/search?q=${encodeURIComponent(debounced)}` : null,
    null,
  );

  function choose(symbol: string) {
    onSelect(symbol);
    setQuery("");
    setDebounced("");
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor="market-search" className="text-[15px] font-semibold">
        {t.market.searchLabel}
      </label>
      <input
        id="market-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder={t.market.searchPlaceholder}
        className="h-12 w-full rounded-xl border border-line-strong bg-canvas px-4 text-[15px] text-ink placeholder:text-muted"
      />

      <div aria-live="polite">
        {searching && search.loading && (
          <p className="px-1 text-sm text-muted">{t.market.searching}</p>
        )}
        {searching && search.error && !search.loading && (
          <p className="px-1 text-sm text-danger">{tError(search.error)}</p>
        )}
        {searching &&
          !search.loading &&
          !search.error &&
          search.data?.results.length === 0 && (
            <p className="px-1 text-sm text-muted">
              {t.market.noMatches(debounced)}
            </p>
          )}
        {search.data && search.data.results.length > 0 && searching && (
          <ul className="mt-1 flex flex-col overflow-hidden rounded-xl border border-line-strong bg-canvas">
            {search.data.results.map((result) => (
              <li
                key={result.symbol}
                className="border-b border-line last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => choose(result.symbol)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left transition hover:bg-surface-hover"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">
                      {result.name}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {result.exchange} · {result.type.toLowerCase()}
                    </span>
                  </span>
                  <span className="font-mono text-sm text-accent-soft">
                    {result.symbol}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DetailPanel({
  symbol,
  range,
  onRangeChange,
  display,
  usdBrl,
}: {
  symbol: string;
  range: RangeId;
  onRangeChange: (range: RangeId) => void;
  display: DisplayCurrency;
  usdBrl: number | null;
}) {
  const chart = usePolledJson<ChartData>(
    `/api/markets/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`,
    CHART_REFRESH_MS,
  );
  const { t, tag, tError } = useI18n();
  const { formatPrice, formatNumber } = useFormatters();
  const data = chart.data ? convertChart(chart.data, display, usdBrl) : null;
  const notConverted =
    chart.data !== null && !canConvert(chart.data.quote.currency, display);

  return (
    <section
      aria-labelledby="detail-title"
      className="flex min-w-0 flex-col gap-5 rounded-2xl border border-line bg-surface p-[clamp(16px,3vw,28px)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0">
            <h2 id="detail-title" className="truncate text-xl font-bold">
              {t.market.assetNames[symbol] ??
                getWatchName(symbol) ??
                (data ? data.quote.name : symbol)}
            </h2>
            <p className="font-mono text-sm text-muted">
              {symbol}
              {data?.quote.exchange ? ` · ${data.quote.exchange}` : ""}
            </p>
          </div>
          {chart.data && <PriceAlerts key={symbol} quote={chart.data.quote} />}
        </div>

        {data && (
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-3xl font-extrabold">
              {formatPrice(
                data.quote.price,
                data.quote.currency,
                data.quote.priceHint,
              )}
            </span>
            <span className="text-[15px]">
              <ChangeBadge
                change={data.stats.change}
                percent={data.stats.changePercent}
                decimals={decimalsFor(data.quote.price, data.quote.priceHint)}
              />
              <span className="ml-2 text-muted">{t.market.ranges[range]}</span>
            </span>
          </div>
        )}
      </div>

      <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
        <legend className="sr-only">{t.market.timeRange}</legend>
        {RANGES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={range === id}
            onClick={() => onRangeChange(id)}
            className={`inline-flex min-h-11 min-w-12 items-center justify-center rounded-[10px] px-3.5 text-[15px] font-semibold transition ${
              range === id
                ? "bg-accent text-white"
                : "border border-line-strong text-muted hover:bg-surface-hover hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </fieldset>

      {chart.loading && !data && (
        <div className="flex h-80 items-center justify-center rounded-xl border border-line-strong bg-canvas text-muted">
          {t.market.loadingChart}
        </div>
      )}

      {!data && chart.error && (
        <p
          role="alert"
          className="rounded-xl border border-line-strong bg-canvas p-4 text-danger"
        >
          {tError(chart.error)}
        </p>
      )}

      {data && (
        <>
          <PriceChart
            points={data.points}
            range={range}
            currency={data.quote.currency}
            priceHint={data.quote.priceHint}
            previousClose={range === "1d" ? data.quote.previousClose : null}
            label={data.quote.name}
          />

          <dl className="grid grid-cols-3 gap-3">
            {[
              { label: t.market.start, value: data.stats.first },
              { label: t.market.high, value: data.stats.high },
              { label: t.market.low, value: data.stats.low },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-line-strong bg-canvas px-4 py-3"
              >
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="font-mono text-[15px] font-semibold">
                  {formatPrice(
                    value,
                    data.quote.currency,
                    data.quote.priceHint,
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {display !== "native" &&
        data &&
        !notConverted &&
        data.quote.currency === display &&
        chart.data?.quote.currency !== display && (
          <p className="text-sm text-muted">
            {t.market.convertedNote(
              usdBrl === null ? "" : formatNumber(usdBrl, 4),
            )}
          </p>
        )}
      {notConverted && (
        <p className="text-sm text-muted">
          {t.market.notConverted(chart.data?.quote.currency ?? "")}
        </p>
      )}

      <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
        <span
          aria-hidden="true"
          className={`inline-block size-2 rounded-full ${chart.error ? "bg-danger" : "bg-up motion-safe:animate-pulse"}`}
        />
        {chart.error && data
          ? t.market.stale(
              tError(chart.error),
              formatClock(chart.updatedAt, tag),
            )
          : t.market.autoRefresh(
              CHART_REFRESH_MS / 1000,
              formatClock(chart.updatedAt, tag),
            )}
      </p>
    </section>
  );
}

function TopList({
  listId,
  onListChange,
  selected,
  onSelect,
  display,
  usdBrl,
}: {
  listId: WatchListId;
  onListChange: (id: WatchListId) => void;
  selected: string;
  onSelect: (symbol: string) => void;
  display: DisplayCurrency;
  usdBrl: number | null;
}) {
  const { t, tag, tError } = useI18n();
  const { formatPrice } = useFormatters();
  const overview = usePolledJson<OverviewResponse>(
    `/api/markets/overview?list=${listId}`,
    OVERVIEW_REFRESH_MS,
  );
  const list =
    WATCH_LISTS.find((entry) => entry.id === listId) ?? WATCH_LISTS[0];
  const rows = (
    overview.data?.items ??
    list.items.map((item) => ({ ...item, quote: null as Quote | null }))
  ).map((row) => ({
    ...row,
    quote: row.quote ? convertQuote(row.quote, display, usdBrl) : null,
  }));

  return (
    <section
      aria-labelledby="top-title"
      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-surface p-[clamp(16px,3vw,28px)]"
    >
      <h2 id="top-title" className="text-xl font-bold">
        {t.market.topTitle}
      </h2>

      <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
        <legend className="sr-only">{t.market.marketLegend}</legend>
        {WATCH_LISTS.map(({ id }) => (
          <button
            key={id}
            type="button"
            aria-pressed={listId === id}
            onClick={() => onListChange(id)}
            className={`inline-flex min-h-11 items-center rounded-[10px] px-3.5 text-[15px] font-semibold transition ${
              listId === id
                ? "bg-accent text-white"
                : "border border-line-strong text-muted hover:bg-surface-hover hover:text-ink"
            }`}
          >
            {t.market.lists[id].label}
          </button>
        ))}
      </fieldset>

      <p className="text-sm text-muted">
        {t.market.lists[list.id].description}
      </p>

      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          {t.market.tableCaption(t.market.lists[list.id].label)}
        </caption>
        <thead>
          <tr className="text-sm text-muted">
            <th scope="col" className="pb-2 font-medium">
              {t.market.colName}
            </th>
            <th scope="col" className="pb-2 text-right font-medium">
              {t.market.colPrice}
            </th>
            <th scope="col" className="pb-2 text-right font-medium">
              {t.market.colToday}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const change = row.quote ? dayChange(row.quote) : null;
            const isSelected = row.symbol === selected;
            return (
              <tr
                key={row.symbol}
                className={`border-t border-line ${isSelected ? "bg-surface-hover" : ""}`}
              >
                <th scope="row" className="py-0 pr-2 font-normal">
                  <button
                    type="button"
                    onClick={() => onSelect(row.symbol)}
                    aria-pressed={isSelected}
                    className="flex min-h-12 w-full flex-col justify-center text-left"
                  >
                    <span className="text-[15px] font-semibold">
                      {t.market.assetNames[row.symbol] ?? row.name}
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {row.symbol}
                    </span>
                  </button>
                </th>
                <td className="whitespace-nowrap py-2 pl-2 text-right font-mono text-[15px]">
                  {row.quote
                    ? formatPrice(
                        row.quote.price,
                        row.quote.currency,
                        row.quote.priceHint,
                      )
                    : overview.loading
                      ? "…"
                      : "—"}
                </td>
                <td className="whitespace-nowrap py-2 pl-3 text-right text-sm">
                  <ChangeBadge
                    compact
                    change={change?.change ?? null}
                    percent={change?.changePercent ?? null}
                    decimals={
                      row.quote
                        ? decimalsFor(row.quote.price, row.quote.priceHint)
                        : 2
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {overview.error && (
        <p role="alert" className="text-sm text-danger">
          {tError(overview.error)}
        </p>
      )}
      <p className="text-sm text-muted">
        {t.market.updated(formatClock(overview.updatedAt, tag))}
      </p>
    </section>
  );
}

export function MarketQuotes() {
  const { t } = useI18n();
  const { formatNumber } = useFormatters();
  const [listId, setListId] = useState<WatchListId>("currencies");
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [range, setRange] = useState<RangeId>("1d");
  const [display, setDisplay] = useState<DisplayCurrency>("native");
  const rate = usePolledJson<{ usdBrl: number }>(
    "/api/markets/rate",
    OVERVIEW_REFRESH_MS,
  );
  const usdBrl = rate.data?.usdBrl ?? null;

  // A notification links here with ?symbol=..., so open that asset.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("symbol");
    if (requested && isValidSymbol(requested)) setSymbol(requested);
  }, []);

  function handleListChange(id: WatchListId) {
    setListId(id);
    const first = WATCH_LISTS.find((entry) => entry.id === id)?.items[0];
    if (first) setSymbol(first.symbol);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-5 rounded-2xl border border-line bg-surface p-[clamp(16px,3vw,28px)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-8">
        <SearchBox onSelect={setSymbol} />

        <fieldset className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0">
          <legend className="mb-2 text-[15px] font-semibold">
            {t.market.showPricesIn}
          </legend>
          {DISPLAY_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={display === id}
              disabled={id !== "native" && usdBrl === null}
              onClick={() => setDisplay(id)}
              className={`inline-flex min-h-11 items-center rounded-[10px] px-3.5 text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                display === id
                  ? "bg-accent text-white"
                  : "border border-line-strong text-muted hover:bg-surface-hover hover:text-ink"
              }`}
            >
              {id === "native" ? t.market.displayNative : label}
            </button>
          ))}
          {usdBrl !== null && (
            <span className="text-sm text-muted">
              {t.market.rate(formatNumber(usdBrl, 4))}
            </span>
          )}
        </fieldset>
      </section>

      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <DetailPanel
          symbol={symbol}
          range={range}
          onRangeChange={setRange}
          display={display}
          usdBrl={usdBrl}
        />
        <TopList
          listId={listId}
          onListChange={handleListChange}
          selected={symbol}
          onSelect={setSymbol}
          display={display}
          usdBrl={usdBrl}
        />
      </div>

      <p className="text-sm text-muted">{t.market.disclaimer}</p>
    </div>
  );
}
