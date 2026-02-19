// Fallback JSX namespace if @types/react is not resolved as a module (e.g. in some IDEs).
// Do not add /// <reference types="react" /> here — that can cause "is not a module" errors.
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
