import { it, describe, expect } from "vitest";
import { sum } from "../index";

describe("hello", () => {
  it("sum", () => {
    const s = sum(3, 2);
    expect(s).toEqual(5);
  });
});
