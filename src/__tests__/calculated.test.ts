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
  it("branching", () => {
    const [condition, setCondition] = signal(true);
    const [one, setOne] = signal(1);
    const [two, setTwo] = signal(2);
    const fn = vi.fn(() => (condition() ? one() : two()));
    const calc = calculated(fn);

    expect(calc()).toEqual(1);
    setTwo(3);
    expect(calc()).toEqual(1);
    expect(fn).toBeCalledTimes(1);

    setCondition(false);
    expect(calc()).toEqual(3);
    expect(fn).toBeCalledTimes(2);
    setOne(10);
    expect(calc()).toEqual(3);
    expect(fn).toBeCalledTimes(2); //not called
    setOne(100);
    calc();
    expect(fn).toBeCalledTimes(2); //not called

    setTwo(33);
    expect(calc()).toEqual(33);
    expect(fn).toBeCalledTimes(3); //called again
  });

  it("track dependency on cached calculated", () => {
    const [one, setOne] = signal(1);
    const incremented = calculated(() => one() + 1);
    const doubled = calculated(() => incremented() * 2);

    //now incremented cached the value
    expect(incremented()).toEqual(2);
    expect(doubled()).toEqual(4);
    setOne(10);
    expect(doubled()).toEqual(22);
  });
});
