import { HomeDirectory } from "./components/home-directory";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "./home-directory.css";
import "./home.css";

export default function HomePage() {
  const opsEnabled =
    isOpsEnabled() || process.env.NODE_ENV === "development";

  return (
    <main className="home-directory">
      <HomeDirectory opsEnabled={opsEnabled} />
    </main>
  );
}
