import type { Middleware } from "fresh";
import { encodeHex } from "@std/encoding/hex";
import { deleteCookie, getCookies } from "@std/http/cookie";

import type { State } from "./fresh.ts";
import { getLogger } from "./logs.ts";

export const KVIEW_PANEL_HASH = "KVIEW_PANEL_HASH";
const HASH = Deno.env.get(KVIEW_PANEL_HASH) ?? "";

const logger = getLogger(["kview-panel", "utils", "session"]);

export function createSession(): string {
  const sessionId = crypto.randomUUID();
  globalThis.localStorage.setItem(`session:${sessionId}`, "true");
  logger.info("Created new session: {sessionId}", { sessionId });
  return sessionId;
}

export async function hashUsernamePassword(username: string, password: string): Promise<string> {
  const messageBuffer = new TextEncoder().encode(`kview-panel:${username}:${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", messageBuffer);
  return encodeHex(hashBuffer);
}

export async function authenticate(
  username: File | string | null,
  password: File | string | null,
): Promise<string | null> {
  logger.debug("Authenticating user");
  if (typeof username !== "string" || typeof password !== "string") {
    return null;
  }
  const hash = await hashUsernamePassword(username, password);
  if (hash === HASH) {
    logger.info("Authentication successful for user: {username}", { username });
    return createSession();
  }
  logger.warn("Authentication failed for user: {username}", { username });
  return null;
}

export const sessionMiddleware: Middleware<State> = (ctx): Response | Promise<Response> => {
  const cookies = getCookies(ctx.req.headers);
  ctx.state.sessionId = null;
  const sessionId: string | undefined = cookies["kview-panel-session"];
  if (ctx.url.pathname === "/logout") {
    if (sessionId) {
      globalThis.localStorage.removeItem(`session:${sessionId}`);
      logger.info("Logged out session: {sessionId}", { sessionId });
    }
    const headers = new Headers();
    deleteCookie(headers, "kview-panel-session");
    headers.set("Location", "/login");
    return new Response(null, { status: 302, headers });
  }
  if (sessionId) {
    logger.debug("Found session cookie: {sessionId}", { sessionId });
    const loggedIn = globalThis.localStorage.getItem(`session:${sessionId}`);
    if (loggedIn) {
      ctx.state.sessionId = sessionId;
      return ctx.next();
    }
  }
  logger.debug("Not authenticated, redirecting to /login");
  if (ctx.url.pathname === "/login") {
    return ctx.next();
  } else {
    return Response.redirect(new URL("/login", ctx.url));
  }
};
