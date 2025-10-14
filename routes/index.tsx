import { AppFrame } from "../components/AppFrame.tsx";
import KvExplorer from "../islands/KvExplorer.tsx";
import { define } from "../utils/fresh.ts";

export default define.page(function Home(_ctx) {
  return (
    <AppFrame selected="home">
      <KvExplorer />
    </AppFrame>
  );
});
