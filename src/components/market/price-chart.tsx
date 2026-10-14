"use client";

import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useI18n } from "@/i18n/provider";
import { useFormatters } from "@/i18n/use-formatters";
import {
  areaPath,
  evenIndexes,
  indexAtX,
  linePath,
  niceTicks,
  paddedDomain,
  scaleX,
  scaleY,
} from "@/lib/chart-utils";
import type { ChartPoint, RangeId } from "@/lib/market-data";
import { decimalsFor } from "@/lib/market-format";

interface PriceChartProps {
  points: readonly ChartPoint[];
  range: RangeId;
  currency: string;
  priceHint: number | null;
  /** Drawn as a dashed reference line when it falls inside the plot. */
  previousClose: number | null;
  /** Short description for assistive technology, e.g. "US Dollar". */
  label: string;
}

/** The chart fills its container but never gets shorter than this. */
const MIN_HEIGHT = 320;
const MARGIN = { top: 12, right: 64, bottom: 28, left: 8 };
const TOOLTIP_HALF_WIDTH = 96;

export function PriceChart({
  points,
  range,
  currency,
  priceHint,
  previousClose,
  label,
}: PriceChartProps) {
  const { t } = useI18n();
  const {
    formatAxisTime,
    formatNumber,
    formatPercent,
    formatPrice,
    formatTooltipTime,
  } = useFormatters();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(MIN_HEIGHT);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    setWidth(element.clientWidth);
    setHeight(Math.max(MIN_HEIGHT, element.clientHeight));
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
      setHeight(Math.max(MIN_HEIGHT, entry.contentRect.height));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const count = points.length;
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const baselineY = MARGIN.top + innerHeight;

  const values = points.map((point) => point.c);
  const showPrevious =
    previousClose !== null &&
    previousClose >= Math.min(...values) * 0.97 &&
    previousClose <= Math.max(...values) * 1.03;
  const domain = paddedDomain(
    showPrevious ? [...values, previousClose] : values,
  );
  const decimals = decimalsFor(values[count - 1] ?? 0, priceHint);

  const coords = points.map((point, index) => ({
    x: scaleX(index, count, MARGIN.left, innerWidth),
    y: scaleY(point.c, domain, MARGIN.top, innerHeight),
  }));

  const yTicks = niceTicks(domain, 5);
  const xTickIndexes = evenIndexes(count, width < 480 ? 3 : 5);

  const active = hover !== null && hover < count ? hover : null;
  const activePoint = active !== null ? points[active] : null;
  const activeCoord = active !== null ? coords[active] : null;

  const first = values[0];
  const last = values[count - 1];
  const summary = t.market.chartSummary(
    label,
    t.market.ranges[range],
    formatPrice(first, currency, priceHint),
    formatPrice(last, currency, priceHint),
    formatPrice(Math.min(...values), currency, priceHint),
    formatPrice(Math.max(...values), currency, priceHint),
  );

  const shown = active !== null ? points[active] : points[count - 1];
  const valueText = shown
    ? `${formatTooltipTime(shown.t, range)}: ${formatPrice(shown.c, currency, priceHint)}`
    : "";

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!rect) return;
    setHover(
      indexAtX(event.clientX - rect.left, count, MARGIN.left, innerWidth),
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = active ?? count - 1;
    const next =
      event.key === "ArrowLeft"
        ? current - 1
        : event.key === "ArrowRight"
          ? current + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? count - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    setHover(Math.min(count - 1, Math.max(0, next)));
  }

  const tooltipLeft = activeCoord
    ? Math.min(
        Math.max(activeCoord.x, TOOLTIP_HALF_WIDTH),
        Math.max(TOOLTIP_HALF_WIDTH, width - TOOLTIP_HALF_WIDTH),
      )
    : 0;
  const sinceStart =
    activePoint && first !== 0 ? ((activePoint.c - first) / first) * 100 : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full flex-1"
      style={{ minHeight: MIN_HEIGHT }}
    >
      {width > 0 && count > 0 && (
        <>
          <div
            role="slider"
            aria-label={summary}
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={count - 1}
            aria-valuenow={active ?? count - 1}
            aria-valuetext={valueText}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onBlur={() => setHover(null)}
            className="absolute inset-0 rounded-lg"
          >
            <svg
              aria-hidden="true"
              width={width}
              height={height}
              className="block"
            >
              {yTicks.map((tick) => {
                const y = scaleY(tick, domain, MARGIN.top, innerHeight);
                return (
                  <g key={tick}>
                    <line
                      x1={MARGIN.left}
                      x2={MARGIN.left + innerWidth}
                      y1={y}
                      y2={y}
                      className="stroke-line"
                      strokeWidth={1}
                    />
                    <text
                      x={MARGIN.left + innerWidth + 8}
                      y={y}
                      dominantBaseline="middle"
                      className="fill-muted text-[11px]"
                    >
                      {formatNumber(tick, decimals)}
                    </text>
                  </g>
                );
              })}

              {showPrevious && previousClose !== null && (
                <line
                  x1={MARGIN.left}
                  x2={MARGIN.left + innerWidth}
                  y1={scaleY(previousClose, domain, MARGIN.top, innerHeight)}
                  y2={scaleY(previousClose, domain, MARGIN.top, innerHeight)}
                  className="stroke-line-strong"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              )}

              {xTickIndexes.map((index, position) => (
                <text
                  key={index}
                  x={coords[index].x}
                  y={height - 8}
                  textAnchor={
                    position === 0
                      ? "start"
                      : position === xTickIndexes.length - 1
                        ? "end"
                        : "middle"
                  }
                  className="fill-muted text-[11px]"
                >
                  {formatAxisTime(points[index].t, range)}
                </text>
              ))}

              {count > 1 && (
                <path
                  d={areaPath(coords, baselineY)}
                  className="fill-accent-soft/10"
                />
              )}
              <path
                d={linePath(coords)}
                fill="none"
                className="stroke-accent-soft"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {count === 1 && (
                <circle
                  cx={coords[0].x}
                  cy={coords[0].y}
                  r={4}
                  className="fill-accent-soft"
                />
              )}

              {activeCoord && (
                <g pointerEvents="none">
                  <line
                    x1={activeCoord.x}
                    x2={activeCoord.x}
                    y1={MARGIN.top}
                    y2={baselineY}
                    className="stroke-muted"
                    strokeWidth={1}
                  />
                  <circle
                    cx={activeCoord.x}
                    cy={activeCoord.y}
                    r={5}
                    className="fill-accent-soft stroke-surface"
                    strokeWidth={2}
                  />
                </g>
              )}

              <rect
                x={MARGIN.left}
                y={MARGIN.top}
                width={innerWidth}
                height={innerHeight}
                fill="transparent"
                style={{ touchAction: "pan-y" }}
                onPointerMove={handlePointerMove}
                onPointerDown={handlePointerMove}
                onPointerLeave={() => setHover(null)}
              />
            </svg>
          </div>

          {activePoint && activeCoord && (
            <div
              className="pointer-events-none absolute top-1 z-10 w-48 -translate-x-1/2 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm shadow-[0_6px_20px_rgba(0,0,0,0.5)]"
              style={{ left: tooltipLeft }}
            >
              <div className="text-xs text-muted">
                {formatTooltipTime(activePoint.t, range)}
              </div>
              <div className="font-mono text-base font-semibold">
                {formatPrice(activePoint.c, currency, priceHint)}
              </div>
              {sinceStart !== null && (
                <div className="text-xs text-muted">
                  {formatPercent(sinceStart)} since start
                </div>
              )}
            </div>
          )}

          <p className="sr-only" aria-live="polite">
            {activePoint
              ? `${formatTooltipTime(activePoint.t, range)}: ${formatPrice(activePoint.c, currency, priceHint)}`
              : ""}
          </p>
        </>
      )}
    </div>
  );
}
