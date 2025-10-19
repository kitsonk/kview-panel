import { type KvEntryMaybeJSON, type KvKeyJSON, toKey } from "@deno/kv-utils/json";
import { equals } from "@kitsonk/kv-toolbox/keys";
import { signal } from "@preact/signals";
import { IS_BROWSER } from "fresh/runtime";

import { Toaster } from "../components/Toaster.tsx";
import { WatchedStore } from "../components/WatchedStore.tsx";
import { addNotification } from "../utils/state.ts";

export interface WatchNotification {
  entries: KvEntryMaybeJSON[];
}

const entries = signal<KvEntryMaybeJSON[]>([]);

async function deleteKey(key: KvKeyJSON) {
  const res = await fetch(new URL("/api/watch", globalThis.location.href), {
    method: "DELETE",
    body: JSON.stringify({ key }),
    headers: {
      "content-type": "application/json",
    },
  });
  if (res.ok) {
    const k = toKey(key);
    entries.value = entries.value.filter(({ key }) => !equals(k, toKey(key)));
    addNotification("Watch removed", "success", true);
  } else {
    addNotification("Could not delete watch.", "error", true);
  }
}

if (IS_BROWSER) {
  const url = new URL("/api/watch/server", globalThis.location.href);
  url.protocol = url.protocol === "http:" ? "ws:" : "wss:";
  const ws = new WebSocket(url);
  ws.addEventListener("open", () => {
    console.log("WebSocket connection established for watches.");
  });
  ws.addEventListener("message", ({ data }) => {
    const message: WatchNotification = JSON.parse(data);
    entries.value = message.entries;
  });
}

export default function Watches() {
  return entries.value.length
    ? (
      <>
        <Toaster />
        <WatchedStore
          entries={entries}
          deleteHandler={(key) => deleteKey(key)}
        />
      </>
    )
    : (
      <>
        <Toaster />
        <div class="col-span-3 p-8 flex justify-center">
          <div class="italic text-gray-600 dark:text-gray-400">no watches</div>
        </div>
      </>
    );
}
