import type { Signalish, SignalLike } from "preact";
import { useSignal } from "@preact/signals";

export type MaybeSignalish<T> = T | undefined | SignalLike<T | undefined>;

export function isSignalLike<T>(value: unknown): value is SignalLike<T> {
  return !!(value && typeof value === "object" && "value" in value &&
    "peek" in value && typeof value.peek === "function" &&
    "subscribe" in value && typeof value.subscribe === "function");
}

export function asSignal<T>(value: Signalish<T>): SignalLike<T> {
  // deno-lint-ignore react-rules-of-hooks
  return isSignalLike(value) ? value : useSignal(value);
}
