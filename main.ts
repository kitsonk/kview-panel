import "@std/dotenv/load";

import {
  entryMaybeToJSON,
  entryToJSON,
  keyToJSON,
  type KvKeyJSON,
  type KvValueJSON,
  toKey,
  toValue,
} from "@deno/kv-utils/json";
import { type BlobJSON, toValue as toBlob } from "@kitsonk/kv-toolbox/blob";
import { matches } from "@oak/commons/media_types";
import { effect } from "@preact/signals";
import { assert } from "@std/assert/assert";
import { App, staticFiles } from "fresh";

import { type State } from "./utils/fresh.ts";
import { isBlobJSON, keyCountToResponse, parseQuery, pathToKey, treeToResponse } from "./utils/kv.ts";
import { getKv } from "./utils/kv_state.ts";
import { getLogger } from "./utils/logs.ts";
import { sessionMiddleware } from "./utils/session.ts";
import { state } from "./utils/state.ts";
import { addWatch, deleteWatch, parseWatchBody, serialize, watchKv, type WatchNotification } from "./utils/watches.ts";

interface PutBody {
  value: KvValueJSON | BlobJSON;
  versionstamp?: string | null;
  expireIn?: number;
  overwrite?: boolean;
}

type DeleteBody = KvKeyJSON[] | { versionstamp: string };

export const app = new App<State>();

const logger = getLogger(["kview-panel", "main"]);

function notFound() {
  return Response.json({ status: 404, statusText: "Not Found" }, {
    status: 404,
    statusText: "Not Found",
  });
}

app
  .use(
    staticFiles(),
    async (ctx) => {
      performance.mark("request-start");
      const res = await ctx.next();
      performance.mark("request-end");
      performance.measure("request-duration", {
        start: "request-start",
        end: "request-end",
      });
      const duration = performance.getEntriesByName("request-duration").pop();
      if (duration) {
        logger.info("{method} {url} - {status} - {duration}ms", {
          method: ctx.req.method,
          url: ctx.req.url,
          status: res.status,
          duration: duration.duration.toFixed(2),
        });
      }
      return res;
    },
    sessionMiddleware,
  )
  .get("/api/kv{/}?:path*", async ({ req, params: { path = "" } }) => {
    const prefix = path === "" ? [] : pathToKey(path);
    const kv = await getKv();
    const url = new URL(req.url, import.meta.url);
    if (url.searchParams.has("entry")) {
      const maybeEntry = await kv.get(prefix);
      if (maybeEntry.versionstamp !== null) {
        return Response.json(entryToJSON(maybeEntry));
      } else {
        logger.info("Not Found: {path}", { path });
        return notFound();
      }
    } else if (url.searchParams.has("blob")) {
      const maybeBlob = await kv.getAsBlob(prefix, { json: true });
      if (maybeBlob) {
        return Response.json({
          value: maybeBlob,
          key: keyToJSON(prefix),
        });
      } else {
        logger.info("Not Found: {path}", { path });
        return notFound();
      }
    } else if (url.searchParams.has("meta")) {
      const maybeMeta = await kv.getMeta(prefix);
      if (maybeMeta.value) {
        return Response.json({
          meta: maybeMeta.value,
          versionstamp: maybeMeta.versionstamp,
          key: keyToJSON(prefix),
        });
      } else {
        logger.info("Not Found: {path}", { path });
        return notFound();
      }
    } else if (url.searchParams.has("tree")) {
      const q = url.searchParams.get("q");
      const data = await (q ? parseQuery(kv, prefix, q).tree() : kv.tree(prefix));
      return treeToResponse(data);
    } else {
      const q = url.searchParams.get("q");
      const data = await (q ? parseQuery(kv, prefix, q).counts() : kv.counts(prefix));
      return keyCountToResponse(data);
    }
  })
  .put("/api/kv{/}?:path*", async ({ req, params: { path = "" } }) => {
    try {
      const key = pathToKey(path);
      const kv = await getKv();
      const contentType = req.headers.get("content-type") ?? "";
      if (matches(contentType, ["application/json"])) {
        const { value, versionstamp = null, expireIn, overwrite }: PutBody = await req.json();
        if (isBlobJSON(value)) {
          await kv.setBlob(key, toBlob(value), { expireIn });
          return Response.json({ ok: true });
        } else {
          assert(
            typeof value === "object" && "type" in value && "value" in value,
          );
          let op = kv.atomic();
          if (!overwrite) {
            op = op.check({ key, versionstamp });
          }
          op = op.set(key, toValue(value), { expireIn });
          const results = await op.commit();
          for (const res of results) {
            if (!res.ok) {
              return Response.json(res, {
                status: 409,
                statusText: "Conflict",
              });
            }
          }
          return Response.json(results, { status: 200, statusText: "OK" });
        }
      }
      if (matches(contentType, ["multipart/form-data"])) {
        const formData = await req.formData();
        const file = formData.get("file");
        if (file instanceof File) {
          await kv.setBlob(key, file);
          return Response.json({ ok: true });
        } else {
          return Response.json({
            status: 400,
            statusText: "Bad Request",
            error: "Missing form field 'file'.",
          });
        }
      }
      if (contentType) {
        const blob = await req.blob();
        await kv.setBlob(key, blob);
        return Response.json({ ok: true });
      }
      return Response.json({
        status: 400,
        statusText: "Bad Request",
        error: "No content type supplied.",
      });
    } catch (err) {
      return Response.json({
        status: 400,
        statusText: "Bad Request",
        error: err instanceof Error
          ? {
            name: err.name,
            message: err.message,
            stack: err.stack,
          }
          : err,
      }, { status: 400, statusText: "BadRequest" });
    }
  })
  .delete("/api/kv{/}?:path*", async ({ req, params: { path = "" } }) => {
    try {
      const kv = await getKv();
      const key = pathToKey(path);
      const body: DeleteBody = await req.json();
      if (Array.isArray(body)) {
        const op = kv.atomic();
        for (const item of body) {
          op.delete([...key, ...toKey(item)]);
        }
        const results = await op.commit();
        for (const res of results) {
          if (!res.ok) {
            return Response.json(res, {
              status: 422,
              statusText: "Unprocessable Content",
            });
          }
        }
        return Response.json(results, { status: 200, statusText: "OK" });
      } else {
        const url = new URL(req.url, import.meta.url);
        if (url.searchParams.has("blob")) {
          await kv.delete(key, { blob: true });
          return Response.json({ ok: true });
        } else {
          const { versionstamp } = body;
          const results = await kv
            .atomic().check({ key, versionstamp }).delete(key).commit();
          for (const res of results) {
            if (!res.ok) {
              return Response.json(res, {
                status: 409,
                statusText: "Conflict",
              });
            }
          }
          return Response.json(results, { status: 200, statusText: "OK" });
        }
      }
    } catch (err) {
      return Response.json({
        status: 400,
        statusText: "Bad Request",
        error: err instanceof Error
          ? {
            name: err.name,
            message: err.message,
            stack: err.stack,
          }
          : err,
      }, { status: 400, statusText: "BadRequest" });
    }
  })
  .get("/api/watch/server", ({ req }) => {
    if (req.headers.get("upgrade") != "websocket") {
      return new Response(null, { status: 501 });
    }
    const { socket, response } = Deno.upgradeWebSocket(req);

    const messages = new ReadableStream<WatchNotification>({
      start(controller) {
        effect(() => {
          watchKv(state.watches.value, controller);
        });
        socket.addEventListener("close", () => controller.close());
      },
      cancel() {
        socket.close();
      },
    });

    socket.addEventListener("open", async () => {
      logger.info("WebSocket connection established");
      for await (const { entries } of messages) {
        socket.send(JSON.stringify({ entries: entries.map(entryMaybeToJSON) }));
      }
    });
    socket.addEventListener("close", () => {
      logger.info("WebSocket connection closed");
    });

    return response;
  })
  .get("/api/watch", () => {
    return Response.json(serialize(state.watches.value));
  })
  .put("/api/watch", async ({ req }) => {
    try {
      const body = await req.json();
      const { key } = parseWatchBody(body);
      state.watches.value = addWatch(key, state.watches.value);
      return Response.json({ status: 200, statusText: "OK" });
    } catch (err) {
      return Response.json({
        status: 400,
        statusText: "Bad Request",
        error: err instanceof Error
          ? {
            name: err.name,
            message: err.message,
            stack: err.stack,
          }
          : err,
      }, { status: 400, statusText: "BadRequest" });
    }
  })
  .delete("/api/watch", async ({ req }) => {
    try {
      const body = await req.json();
      const { key } = parseWatchBody(body);
      state.watches.value = deleteWatch(key, state.watches.value);
      return Response.json({ status: 200, statusText: "OK" });
    } catch (err) {
      return Response.json({
        status: 400,
        statusText: "Bad Request",
        error: err instanceof Error
          ? {
            name: err.name,
            message: err.message,
            stack: err.stack,
          }
          : err,
      }, { status: 400, statusText: "BadRequest" });
    }
  })
  .fsRoutes();
