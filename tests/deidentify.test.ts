import { describe, expect, it } from "vitest";
import { inputHash } from "@/server/ai/deidentify";

describe("inputHash", () => {
  it("is stable across object key order", () => {
    expect(inputHash({ b: 2, a: 1 })).toBe(inputHash({ a: 1, b: 2 }));
  });
});
