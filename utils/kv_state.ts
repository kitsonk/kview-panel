import { type KvToolbox, openKvToolbox } from "@kitsonk/kv-toolbox";

let p: Promise<KvToolbox> | undefined;

export function getKv(): Promise<KvToolbox> {
  if (!p) {
    p = openKvToolbox();
  }
  return p;
}
