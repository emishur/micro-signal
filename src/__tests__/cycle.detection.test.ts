import { it, describe, expect, vi } from "vitest";
import { signal, calculated, effect, batch } from "../signal";

describe("graph potential cycles detection", () => {
  it("detect cycle in calculated value", () => {
    const [one, setOne] = signal(1);
    const [two] = signal(2);
    const calc = calculated(() => {
      const result = one() + two();
      setOne(5);
      return result;
    });
    expect(() => calc()).toThrowError();
  });

  it("detect cycle in effect value", () => {
    const [one, setOne] = signal(1);
    const [two] = signal(2);
    const createEffect = () =>
      effect(() => {
        console.log("effect", one() + two());
        setOne(5);
      });
    expect(createEffect).toThrowError();
  });
});
