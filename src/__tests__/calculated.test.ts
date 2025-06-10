import { it, describe, expect, vi } from "vitest";
import { signal, calculated } from "../signal";

describe("calculated values", () => {
  it("one signal dependency", () => {
    const [num, setNum] = signal(1);
    const incremented = calculated(() => {
      return num() + 1;
    });
    expect(num()).toEqual(1);
    expect(incremented()).toEqual(2);

    setNum(5);
    expect(num()).toEqual(5);
    expect(incremented()).toEqual(6);
  });

  it("multiple signal dependency", () => {
    const [one, setOne] = signal(1);
    const [two, setTwo] = signal(2);
    const [three] = signal(3);
    const add12 = calculated(() => one() + two());
    const add23 = calculated(() => two() + three());

    expect(add12()).toEqual(3);
    expect(add23()).toEqual(5);

    setOne(10);
    expect(add12()).toEqual(12);
    expect(add23()).toEqual(5);

    setTwo(8);
    expect(add12()).toEqual(18);
    expect(add23()).toEqual(11);
  });
  it("cascade", () => {
    const [one] = signal(1);
    const [two, setTwo] = signal(2);
    const add1 = calculated(() => one() + two());
    const add2 = calculated(() => add1() + two());

    expect(add2()).toEqual(5);
    setTwo(10);
    expect(add2()).toEqual(21);
  });

  it("calculated memo values", () => {
    const [one] = signal(1);
    const [two] = signal(2);

    const calc1 = vi.fn(() => one() + two());
    const add1 = calculated(calc1);

    const calc2 = vi.fn(() => add1() + two());
    const add2 = calculated(calc2);

    expect(add2()).toEqual(5);
    expect(add2()).toEqual(5);
    expect(calc1).toBeCalledTimes(1);
    expect(calc2).toBeCalledTimes(1);
  });
});
