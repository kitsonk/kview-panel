/// <reference lib="deno.unstable" />

import { createDefine } from "fresh";

export interface State {
  sessionId: string | null;
}

export const define = createDefine<State>();
