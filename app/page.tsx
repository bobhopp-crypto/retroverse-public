import { HomePosterFrame } from "./components/home-poster-frame";
import "./home.css";

export default function HomePage() {
  return (
    <main className="home-main">
      <div className="poster-shell">
        <HomePosterFrame />
      </div>
    </main>
  );
}
