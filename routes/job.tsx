import { Head } from "fresh/runtime";

import { AppFrame } from "../components/AppFrame.tsx";
import { Jobs } from "../components/Jobs.tsx";
import { define } from "../utils/fresh.ts";

export default define.page(function Local() {
  return (
    <AppFrame selected="jobs">
      <Head>
        <title>Jobs &mdash; kview panel</title>
      </Head>
      <Jobs />
    </AppFrame>
  );
});
