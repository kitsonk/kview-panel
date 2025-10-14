import { type KvKeyJSON } from "@deno/kv-utils/json";
import { type ComponentChildren } from "preact";
import { effect, signal } from "@preact/signals";

import { getWatches, setWatches } from "./watches.ts";

type NotificationType = "error" | "warning" | "success";

export interface Notification {
  type: NotificationType;
  message: ComponentChildren;
  id: number;
  dismissible?: boolean;
}

export interface KvWatchJson {
  databaseId: string;
  key: KvKeyJSON;
}

function createAppState() {
  const watches = signal(getWatches());
  const notifications = signal<Notification[]>([]);

  effect(() => setWatches(watches.value));

  return {
    watches,
    notifications,
  };
}

export const state = createAppState();

let id = 0;

export function addNotification(
  message: ComponentChildren,
  type: NotificationType,
  dismissible?: boolean,
  expire = 10,
) {
  id++;
  const notification = { message, type, dismissible, id };
  setTimeout(() => {
    state.notifications.value = state
      .notifications.value.filter(({ id: i }) => i !== id);
  }, expire * 1000);
  state.notifications.value = [...state.notifications.value, notification];
}
