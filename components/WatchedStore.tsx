import { type KvEntryMaybeJSON, type KvKeyJSON } from "@deno/kv-utils/json";
import { type Signal } from "@preact/signals";

import { KvKey } from "./KvKey.tsx";
import { KvValue } from "./KvValue.tsx";
import IconTrashcan from "./icons/Trashcan.tsx";
import { keyJsonToPath } from "../utils/kv.ts";

function WatchedEntry(
  { entry: { key, value, versionstamp }, deleteEntry }: { entry: KvEntryMaybeJSON; deleteEntry: () => void },
) {
  return (
    <div key={keyJsonToPath(key)} class="border rounded p-4 mb-4">
      <div class="flex">
        <h2 class="font-bold my-2 flex-grow">Key</h2>
        <button
          type="button"
          class="flex-none text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-4 focus:outline-none focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg text-sm p-1.5"
          onClick={deleteEntry}
        >
          <IconTrashcan size={4} />
        </button>
      </div>
      <KvKey value={key} noLink />
      {value
        ? (
          <>
            <KvValue value={value} />
            <div class="text-sm text-gray-600 dark:text-gray-400 p-1 italic">
              Version: {versionstamp}
            </div>
          </>
        )
        : (
          <div class="w-auto p-8 flex justify-center">
            <div class="italic text-gray-600 dark:text-gray-400">
              no value
            </div>
          </div>
        )}
    </div>
  );
}

export function WatchedStore(
  { entries, deleteHandler }: { entries: Signal<KvEntryMaybeJSON[]>; deleteHandler: (key: KvKeyJSON) => void },
) {
  return (
    <div class="col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
      {entries.value.map((entry, id) => (
        <WatchedEntry
          key={id}
          entry={entry}
          deleteEntry={() => deleteHandler(entry.key)}
        />
      ))}
    </div>
  );
}
