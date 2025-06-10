import { it, describe, expect } from "vitest";
import { signal, calculated } from "../signal";

describe("calculated values", () => {
  it("one signal dependency", () => {
    const [num, setNum] = signal(1);
    const incremented = calculated(() => {
      return num() + 1;
    });
    expect(num()).toEqual(1);
    expect(incremented()).toEqual(2);
  });
});
