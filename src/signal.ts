type Downstream = {
  invalidate: () => void;
  dependsOn: (u: Upstream) => void;
};
type Upstream = {
  detachFrom: (d: Downstream) => void;
};

type Effect = () => void;
const callstack: Downstream[] = [];
const pendingEffects = new Set<Effect>();
let batchLevel = 0;

//Used to detect cyclic dependencies in a graph
let isExecuting = false;

const createDependentsTracker = () => {
  const dependents = new Set<Downstream>();
  const upstream = {
    detachFrom: (d: Downstream) => dependents.delete(d),
  };
  const addDependent = () => {
    const caller = callstack.at(-1);
    if (caller) {
      dependents.add(caller);
      caller.dependsOn(upstream);
    }
  };
  const invalidateAll = () => {
    dependents.forEach((d) => d.invalidate());
    dependents.clear();
  };
  return {
    addDependent,
    invalidateAll,
  };
};

const createDependenciesTracker = () => {
  const dependencies = new Set<Upstream>();

  const dependsOn = (u: Upstream) => dependencies.add(u);
  const detachFrom = (d: Downstream) => {
    dependencies.forEach((u) => u.detachFrom(d));
    dependencies.clear();
  };

  return {
    dependsOn,
    detachFrom,
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
  const dependents = createDependentsTracker();
  const getter = () => {
    dependents.addDependent();
    return value;
  };
  const setter = (newValue: NonVoid<T>) => {
    if (isExecuting)
      throw new Error(
        "There is a cyclic dependencies in dependency graph.\nSome effect or calculated value calls a signal setter."
      );
    value = newValue;
    dependents.invalidateAll();
    //TODO: detach dependencies
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
  const dependents = createDependentsTracker();
  const dependencies = createDependenciesTracker();

  const thisNode: Downstream = {
    invalidate: () => {
      memo = invalid;
      dependents.invalidateAll();
      dependencies.detachFrom(thisNode);
    },
    dependsOn: (u: Upstream) => dependencies.dependsOn(u),
  };

  const getter = (): T => {
    dependents.addDependent();
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
  const dependencies = createDependenciesTracker();

  const thisNode: Downstream = {
    invalidate: () => pendingEffects.add(effect),
    dependsOn: (u: Upstream) => dependencies.dependsOn(u),
  };
  const effect = () => {
    dependencies.detachFrom(thisNode);
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
    dependencies.detachFrom(thisNode);
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
