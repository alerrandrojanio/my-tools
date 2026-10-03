import { describe, expect, it } from "vitest";
import { formatJson, minifyJson } from "./json-utils";

describe("formatJson", () => {
  it("pretty-prints with 2 spaces by default", () => {
    expect(formatJson('{"a":[1,2],"b":{"c":true}}')).toEqual({
      ok: true,
      value:
        '{\n  "a": [\n    1,\n    2\n  ],\n  "b": {\n    "c": true\n  }\n}',
    });
  });

  it("supports 4 spaces and tabs", () => {
    expect(formatJson('{"a":1}', { indent: 4 })).toEqual({
      ok: true,
      value: '{\n    "a": 1\n}',
    });
    expect(formatJson('{"a":1}', { indent: "tab" })).toEqual({
      ok: true,
      value: '{\n\t"a": 1\n}',
    });
  });

  it("sorts keys recursively when asked", () => {
    expect(
      formatJson('{"b":1,"a":{"d":1,"c":2}}', { indent: 2, sortKeys: true }),
    ).toEqual({
      ok: true,
      value: '{\n  "a": {\n    "c": 2,\n    "d": 1\n  },\n  "b": 1\n}',
    });
  });

  it("keeps array order and sorts keys of objects inside arrays", () => {
    expect(minifyJson('[{"b":1,"a":2},3]', { sortKeys: true })).toEqual({
      ok: true,
      value: '[{"a":2,"b":1},3]',
    });
  });

  it("accepts any JSON value, not just objects", () => {
    expect(formatJson("42")).toEqual({ ok: true, value: "42" });
    expect(formatJson('"text"')).toEqual({ ok: true, value: '"text"' });
    expect(formatJson("null")).toEqual({ ok: true, value: "null" });
  });

  it("reports invalid JSON with a line and column", () => {
    const result = formatJson('{\n "a": 1,\n}');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.line).toBe(3);
      expect(result.column).toBe(1);
      expect(result.error).not.toBe("");
    }
  });

  it("reports a failure for empty input", () => {
    expect(formatJson("")).toMatchObject({ ok: false });
  });
});

describe("minifyJson", () => {
  it("removes all insignificant whitespace", () => {
    expect(minifyJson('{ "a" : 1,\n "b" : [ 1, 2 ] }')).toEqual({
      ok: true,
      value: '{"a":1,"b":[1,2]}',
    });
  });

  it("reports invalid JSON", () => {
    expect(minifyJson("{nope}")).toMatchObject({ ok: false });
  });
});
