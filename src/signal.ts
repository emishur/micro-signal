type Observer = () => void;
const callstack: Observer[] = [];

const createObservable = () => {
  const dependents = new Set<Observer>();
  const addCallerAsDependent = () => {
    const caller = callstack.at(-1);
    if (caller) dependents.add(caller);
  };
  const invalidateDependents = () => {
    dependents.forEach((d) => d());
    dependents.clear;
  };
  return {
    addCallerAsDependent,
    invalidateDependents,
  };
};

export type NonVoid<T> = T extends void ? never : T;
export type Getter<T> = () => NonVoid<T>;
export type Setter<T> = (value: NonVoid<T>) => void;

export const signal = <T>(value: NonVoid<T>): [Getter<T>, Setter<T>] => {
  const observable = createObservable();
  const getter = () => {
    observable.addCallerAsDependent();
    return value;
  };
  const setter = (newValue: NonVoid<T>) => {
    value = newValue;
    observable.invalidateDependents();
  };
  return [getter, setter];
};

type Invalidated = { valid: false };
type ValidValue<T> = { valid: true; value: NonVoid<T> };
type CalculatedValue<T> = Invalidated | ValidValue<T>;
const invalid: Invalidated = { valid: false };

export const calculated = <T>(fn: () => NonVoid<T>): Getter<T> => {
  let value: CalculatedValue<T> = invalid;
  const observable = createObservable();
  const invalidate = () => {
    value = invalid;
    observable.invalidateDependents();
  };

  const getter = (): NonVoid<T> => {
    if (value.valid === true) return value.value;

    observable.addCallerAsDependent();
    callstack.push(invalidate);
    try {
      const v = fn();
      value = { valid: true, value: v };
      return v;
    } finally {
      callstack.pop();
    }
  };
  return getter;
};
