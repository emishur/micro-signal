import { it, describe, expect, vi } from "vitest";
import { signal, calculated, effect } from "../signal";

describe("effects", () => {
  it("trigger effect", () => {
    const [name, setName] = signal("Jose");
    const greeting = calculated(() => `Hi ${name()}`);
    const eff = vi.fn(() => console.log("effect", greeting()));
    const detach = effect(eff);

    expect(eff).toBeCalledTimes(1);
    setName("Peter");
    expect(eff).toBeCalledTimes(2);

    detach();
    setName("George");
    expect(eff).toBeCalledTimes(2);
  });

  it("diamond glitch", () => {
    const [root, setRoot] = signal(1);
    const branch1 = calculated(() => root() + 1);
    const branch2 = calculated(() => root() + 2);
    const eff = vi.fn(() => console.log(branch1() + branch2()));

    effect(eff);
    expect(eff).toBeCalledTimes(1);
    setRoot(3);
    //to be called just once
    expect(eff).toBeCalledTimes(2);
  });
});
