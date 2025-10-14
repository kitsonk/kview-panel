import { define } from "../utils/fresh.ts";

export default define.page(function App({ Component }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>kview panel - a web app for Deno KV</title>
      </head>
      <body class="dark:bg-gray-900 dark:text-white font-body">
        <Component />
      </body>
    </html>
  );
});
