import type ko from "./ko";

/** Widen string literals to `string`, preserve functions & structure */
type Widen<T> = T extends (...args: infer P) => infer R
  ? (...args: P) => R
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : T extends object
      ? { readonly [K in keyof T]: Widen<T[K]> }
      : T extends string
        ? string
        : T;

export type Dictionary = Widen<typeof ko>;
