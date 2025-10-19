import { equals } from "@kitsonk/kv-toolbox/keys";
import { keyToJSON, type KvKeyJSON, toKey } from "@deno/kv-utils/json";
import * as v from "@valibot/valibot";

export interface WatchNotification {
  entries: Deno.KvEntryMaybe<unknown>[];
}

const WATCHES_KEY = "kview__panel_watches";

const WatchBodySchema = v.object({
  key: v.array(v.union([
    v.object({
      type: v.union([v.literal("bigint"), v.literal("string")]),
      value: v.string(),
    }),
    v.object({
      type: v.literal("boolean"),
      value: v.boolean(),
    }),
    v.object({
      type: v.literal("number"),
      value: v.union([v.number(), v.literal("NaN"), v.literal("Infinity"), v.literal("-Infinity")]),
    }),
    v.object({
      type: v.literal("Uint8Array"),
      value: v.string(),
      byteLength: v.number(),
    }),
  ])),
});

export type WatchBody = v.InferOutput<typeof WatchBodySchema>;

export async function watchKv(keys: Deno.KvKey[], controller: ReadableStreamDefaultController<WatchNotification>) {
  const kv = await Deno.openKv();
  const reader = kv.watch(keys).getReader();
  try {
    let entries;
    while (!(entries = await reader.read()).done) {
      controller.enqueue({ entries: entries.value });
    }
  } catch {
    kv.close();
    reader.cancel();
  }
}

export function parseWatchBody(body: unknown): WatchBody {
  return v.parse(WatchBodySchema, body);
}

export function serialize(watches: Deno.KvKey[]): KvKeyJSON[] {
  return watches.map(keyToJSON);
}

export function getWatches(): Deno.KvKey[] {
  const json = localStorage.getItem(WATCHES_KEY);
  if (json) {
    try {
      return (JSON.parse(json) as KvKeyJSON[]).map(toKey);
    } catch {
      // just swallow here
    }
  }
  return [];
}

export function setWatches(watches: Deno.KvKey[]): void {
  localStorage.setItem(WATCHES_KEY, JSON.stringify(watches.map(keyToJSON)));
}

export function addWatch(key: KvKeyJSON, watches: Deno.KvKey[]): Deno.KvKey[] {
  const w = structuredClone(watches);
  const kvKey = toKey(key);
  if (!w.some((k: Deno.KvKey) => equals(kvKey, k))) {
    w.push(kvKey);
  }
  return w;
}

export function deleteWatch(key: KvKeyJSON, watches: Deno.KvKey[]): Deno.KvKey[] {
  const kvKey = toKey(key);
  return watches.filter((k: Deno.KvKey) => !equals(kvKey, k));
}
