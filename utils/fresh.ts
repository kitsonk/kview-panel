/// <reference lib="deno.unstable" />

import { createDefine } from "fresh";

// deno-lint-ignore no-empty-interface
export interface State {
  // empty for now
}

export const define = createDefine<State>();
