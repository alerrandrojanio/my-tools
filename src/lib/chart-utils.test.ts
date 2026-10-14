import { describe, expect, it } from "vitest";
import {
  areaPath,
  evenIndexes,
  indexAtX,
  linePath,
  niceTicks,
  paddedDomain,
  scaleX,
  scaleY,
} from "./chart-utils";

describe("paddedDomain", () => {
  it("pads the min and max", () => {
    const domain = paddedDomain([10, 20], 0.1);
    expect(domain.min).toBeCloseTo(9);
    expect(domain.max).toBeCloseTo(21);
  });

  it("gives a flat series a visible range", () => {
    const domain = paddedDomain([5, 5, 5]);
    expect(domain.min).toBeLessThan(5);
    expect(domain.max).toBeGreaterThan(5);
  });

  it("handles a flat series at zero", () => {
    const domain = paddedDomain([0, 0]);
    expect(domain.max).toBeGreaterThan(domain.min);
  });
});

describe("niceTicks", () => {
  it("returns round values inside the domain", () => {
    expect(niceTicks({ min: 0, max: 100 }, 5)).toEqual([
      0, 20, 40, 60, 80, 100,
    ]);
    expect(niceTicks({ min: 5.014, max: 5.054 }, 5)).toEqual([
      5.02, 5.03, 5.04, 5.05,
    ]);
  });

  it("returns evenly spaced ticks without float noise", () => {
    const ticks = niceTicks({ min: 0.0031, max: 0.0034 }, 5);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    for (const tick of ticks) {
      expect(String(tick).length).toBeLessThan(10);
    }
  });

  it("keeps every tick inside the domain", () => {
    const domain = { min: 123.4, max: 987.6 };
    for (const tick of niceTicks(domain, 5)) {
      expect(tick).toBeGreaterThanOrEqual(domain.min);
      expect(tick).toBeLessThanOrEqual(domain.max);
    }
  });

  it("degrades gracefully for an empty range", () => {
    expect(niceTicks({ min: 3, max: 3 })).toEqual([3]);
  });
});

describe("scales", () => {
  const domain = { min: 0, max: 10 };

  it("maps larger values higher (smaller y)", () => {
    expect(scaleY(0, domain, 10, 100)).toBe(110);
    expect(scaleY(10, domain, 10, 100)).toBe(10);
    expect(scaleY(5, domain, 10, 100)).toBe(60);
  });

  it("spreads points across the width", () => {
    expect(scaleX(0, 5, 8, 400)).toBe(8);
    expect(scaleX(4, 5, 8, 400)).toBe(408);
    expect(scaleX(2, 5, 8, 400)).toBe(208);
  });

  it("centers a single point", () => {
    expect(scaleX(0, 1, 8, 400)).toBe(208);
  });
});

describe("indexAtX", () => {
  it("returns the nearest point", () => {
    expect(indexAtX(8, 5, 8, 400)).toBe(0);
    expect(indexAtX(408, 5, 8, 400)).toBe(4);
    expect(indexAtX(210, 5, 8, 400)).toBe(2);
    expect(indexAtX(150, 5, 8, 400)).toBe(1); // 42px from point 1, 58px from point 2
    expect(indexAtX(160, 5, 8, 400)).toBe(2); // 52px from point 1, 48px from point 2
  });

  it("clamps outside the plot", () => {
    expect(indexAtX(-50, 5, 8, 400)).toBe(0);
    expect(indexAtX(9999, 5, 8, 400)).toBe(4);
  });

  it("handles degenerate inputs", () => {
    expect(indexAtX(100, 1, 8, 400)).toBe(0);
    expect(indexAtX(100, 5, 8, 0)).toBe(0);
  });
});

describe("evenIndexes", () => {
  it("includes the first and last index", () => {
    expect(evenIndexes(100, 5)).toEqual([0, 25, 50, 74, 99]);
  });

  it("never returns more indexes than items", () => {
    expect(evenIndexes(3, 5)).toEqual([0, 1, 2]);
    expect(evenIndexes(1, 5)).toEqual([0]);
    expect(evenIndexes(0, 5)).toEqual([]);
  });
});

describe("paths", () => {
  const points = [
    { x: 0, y: 10 },
    { x: 5.5, y: 20.25 },
  ];

  it("builds a line path", () => {
    expect(linePath(points)).toBe("M0.00,10.00L5.50,20.25");
    expect(linePath([])).toBe("");
  });

  it("closes an area path down to the baseline", () => {
    expect(areaPath(points, 100)).toBe(
      "M0.00,10.00L5.50,20.25L5.50,100.00L0.00,100.00Z",
    );
    expect(areaPath([], 100)).toBe("");
  });
});
