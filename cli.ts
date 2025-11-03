import { parseArgs } from "jsr:@std/cli@^1.0.23/parse-args";
import { promptSecret } from "jsr:@std/cli@^1.0.23/prompt-secret";
import { bgGreen, bgYellow } from "jsr:@std/fmt@^1.0.8/colors";

import { hashUsernamePassword, KVIEW_PANEL_HASH } from "./utils/session.ts";

const args = parseArgs(Deno.args);

if (args._[0] === "setup") {
  const username = prompt("Enter kview-panel username:");
  const password = promptSecret("Enter kview-panel password:");

  if (username && password) {
    const hash = await hashUsernamePassword(username, password);
    console.log(`\n${bgGreen("Configure the following in your environment:")}`);
    console.log(`\n${KVIEW_PANEL_HASH}=${hash}\n`);
  } else {
    console.warn(bgYellow("Both a username and password are required. Not updating env file"));
  }
} else {
  console.warn(bgYellow("No valid command provided. Available command: configure"));
}
