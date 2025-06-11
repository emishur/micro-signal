type Dependent = {
  invalidate: () => void;
};
type Effect = () => void;
const callstack: Dependent[] = [];
const pendingEffects = new Set<Effect>();
let batchLevel = 0;

//Used to detect cyclic dependencies in a graph
let isExecuting = false;

const createTrackableDependents = () => {
  const dependents = new Set<Dependent>();
  const addCallerAsDependent = () => {
    const caller = callstack.at(-1);
    if (caller) dependents.add(caller);
  };
  const invalidateAll = () => {
    dependents.forEach((d) => d.invalidate());
    dependents.clear();
  };
  const removeExecutingDependent = (d: Dependent) => dependents.delete(d);
  return {
    addCallerAsDependent,
    invalidateAll,
    removeExecutingDependent,
  };
};

const runPendingEffects = () => {
  pendingEffects.forEach((eff) => eff());
  pendingEffects.clear();
};

export type NonVoid<T> = T extends void ? never : T;
export type Getter<T> = () => T;
export type Setter<T> = (value: NonVoid<T>) => void;

export const signal = <T>(value: NonVoid<T>): [Getter<T>, Setter<T>] => {
  const dependents = createTrackableDependents();
  const getter = () => {
    dependents.addCallerAsDependent();
    return value;
  };
  const setter = (newValue: NonVoid<T>) => {
    if (isExecuting)
      throw new Error(
        "There is a cyclic dependencies in dependency graph.\nSome effect or calculated value calls a signal setter."
      );
    value = newValue;
    dependents.invalidateAll();
    if (batchLevel === 0) runPendingEffects();
  };
  return [getter, setter];
};

type Invalidated = { valid: false };
type ValidValue<T> = { valid: true; value: T };
type CalculatedValue<T> = Invalidated | ValidValue<T>;
const invalid: Invalidated = { valid: false };

export const calculated = <T>(fn: () => NonVoid<T>): Getter<T> => {
  let memo: CalculatedValue<T> = invalid;
  const observable = createTrackableDependents();

  const thisNode: Dependent = {
    invalidate: () => {
      memo = invalid;
      observable.invalidateAll();
    },
  };

  const getter = (): T => {
    observable.addCallerAsDependent();
    if (memo.valid === true) return memo.value;

    callstack.push(thisNode);
    isExecuting = true;
    try {
      const value = fn();
      memo = { valid: true, value };
      return value;
    } finally {
      isExecuting = false;
      callstack.pop();
    }
  };
  return getter;
};

/**
 * @return detach function
 */
export const effect = (eff: Effect): (() => void) => {
  let detached = false;

  const thisNode: Dependent = {
    invalidate: () => {
      if (!detached) pendingEffects.add(effect);
    },
  };
  const effect = () => {
    if (detached) return;
    callstack.push(thisNode);
    isExecuting = true;
    try {
      eff();
    } finally {
      isExecuting = false;
      callstack.pop();
    }
  };
  //run effect first time to collect dependencies to track
  effect();
  return () => {
    detached = true;
  };
};

/**
 * Batch (transactional) update of multiple input signals
 */
export const batch = (b: () => void): void => {
  batchLevel++;
  try {
    b();
    if (batchLevel === 1)
      //last level
      runPendingEffects();
  } finally {
    batchLevel--;
  }
};
