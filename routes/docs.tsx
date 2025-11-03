import { Head } from "fresh/runtime";

import { AppFrame } from "../components/AppFrame.tsx";

export default function Local() {
  return (
    <AppFrame selected="docs">
      <Head>
        <title>Documentation &mdash; kview panel</title>
      </Head>
      <div>documentation</div>
    </AppFrame>
  );
}
