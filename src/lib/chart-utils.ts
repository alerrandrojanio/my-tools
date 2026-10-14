export interface Domain {
  min: number;
  max: number;
}

/** Min/max of the values, padded so the line never touches the plot edges. */
export function paddedDomain(
  values: readonly number[],
  padding = 0.08,
): Domain {
  let min = Math.min(...values);
  let max = Math.max(...values);

  if (min === max) {
    // A flat series still needs a visible range around it.
    const spread = Math.abs(min) * 0.01 || 1;
    min -= spread;
    max += spread;
  }

  const pad = (max - min) * padding;
  return { min: min - pad, max: max + pad };
}

function niceStep(rawStep: number): number {
  const exponent = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / 10 ** exponent;
  // Rounding thresholds (like d3) keep the tick count close to the target.
  const nice = fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10;
  return nice * 10 ** exponent;
}

/** "Round" tick values (1, 2, 5 x 10^n) that fall inside the domain. */
export function niceTicks(domain: Domain, target = 5): number[] {
  const range = domain.max - domain.min;
  if (!(range > 0) || target < 2) return [domain.min];

  const step = niceStep(range / (target - 1));
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  const ticks: number[] = [];

  for (
    let value = Math.ceil(domain.min / step) * step;
    value <= domain.max + step * 1e-9;
    value += step
  ) {
    ticks.push(Number(value.toFixed(decimals)));
  }
  return ticks;
}

/** Maps a value in the domain to a vertical pixel (larger values are higher). */
export function scaleY(
  value: number,
  domain: Domain,
  top: number,
  height: number,
): number {
  return top + (1 - (value - domain.min) / (domain.max - domain.min)) * height;
}

/** Maps a point index to a horizontal pixel; a single point sits in the middle. */
export function scaleX(
  index: number,
  count: number,
  left: number,
  width: number,
): number {
  return count <= 1 ? left + width / 2 : left + (index / (count - 1)) * width;
}

/** Index of the point closest to the pixel `x`. */
export function indexAtX(
  x: number,
  count: number,
  left: number,
  width: number,
): number {
  if (count <= 1 || width <= 0) return 0;
  const ratio = (x - left) / width;
  return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));
}

/** `count` indexes spread evenly from the first to the last item. */
export function evenIndexes(length: number, count: number): number[] {
  if (length <= 0) return [];
  if (length === 1 || count <= 1) return [0];
  const wanted = Math.min(count, length);
  return Array.from({ length: wanted }, (_, i) =>
    Math.round((i / (wanted - 1)) * (length - 1)),
  );
}

/** SVG path through the points as a straight-segment line. */
export function linePath(points: readonly { x: number; y: number }[]): string {
  return points
    .map(
      (point, i) =>
        `${i === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`,
    )
    .join("");
}

/** Closed SVG path from the line down to `baselineY` (for the area fill). */
export function areaPath(
  points: readonly { x: number; y: number }[],
  baselineY: number,
): string {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)}L${last.x.toFixed(2)},${baselineY.toFixed(2)}L${first.x.toFixed(2)},${baselineY.toFixed(2)}Z`;
}
