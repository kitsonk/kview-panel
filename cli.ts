import { parseArgs } from "@std/cli/parse-args";
import { promptSecret } from "@std/cli/prompt-secret";
import { exists } from "@std/fs/exists";
import { parse, stringify } from "@std/dotenv";
import { bgGreen, bgYellow } from "@std/fmt/colors";

import { hashUsernamePassword, KVIEW_PANEL_HASH } from "./utils/session.ts";

const args = parseArgs(Deno.args);

if (args._[0] === "configure") {
  const username = prompt("Enter kview-panel username:");
  const password = promptSecret("Enter kview-panel password:");

  if (username && password) {
    const hash = await hashUsernamePassword(username, password);
    const env = await exists(".env") ? parse(await Deno.readTextFile(".env")) : {};
    env[KVIEW_PANEL_HASH] = hash;
    await Deno.writeTextFile(".env", stringify(env));
    console.log(bgGreen(`Updated .env file with ${KVIEW_PANEL_HASH}`));
  } else {
    console.warn(bgYellow("Both a username and password are required. Not updating env file"));
  }
} else {
  console.warn(bgYellow("No valid command provided. Available command: configure"));
}
