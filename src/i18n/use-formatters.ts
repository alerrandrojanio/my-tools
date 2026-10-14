"use client";

import { formatTarget } from "@/lib/alert-utils";
import type { RangeId } from "@/lib/market-data";
import {
  formatAxisTime,
  formatNumber,
  formatPercent,
  formatPrice,
  formatSigned,
  formatTooltipTime,
} from "@/lib/market-format";
import { useI18n } from "./provider";

/**
 * The number/date formatters bound to the site's language, so prices read
 * "R$ 5,04" in Portuguese and "R$5.04" in English whatever the browser uses.
 */
export function useFormatters() {
  const { tag } = useI18n();
  return {
    formatPrice: (value: number, currency: string, priceHint: number | null) =>
      formatPrice(value, currency, priceHint, tag),
    formatNumber: (value: number, decimals: number) =>
      formatNumber(value, decimals, tag),
    formatPercent: (value: number) => formatPercent(value, tag),
    formatSigned: (value: number, decimals: number) =>
      formatSigned(value, decimals, tag),
    formatAxisTime: (ms: number, range: RangeId) =>
      formatAxisTime(ms, range, tag),
    formatTooltipTime: (ms: number, range: RangeId) =>
      formatTooltipTime(ms, range, tag),
    formatTarget: (target: number, currency: string) =>
      formatTarget(target, currency, tag),
  };
}
