import { Head } from "fresh/runtime";

import { AppFrame } from "../components/AppFrame.tsx";
import Watches from "../islands/Watches.tsx";

export default function Local() {
  return (
    <AppFrame selected="watches">
      <Head>
        <title>Watches &mdash; kview-panel</title>
      </Head>
      <Watches />
    </AppFrame>
  );
}
