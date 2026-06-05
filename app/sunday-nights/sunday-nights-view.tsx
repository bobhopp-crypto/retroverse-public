"use client";

import Link from "next/link";
import { useState } from "react";

import {
  SUNDAY_NIGHTS_ABOUT,
  SUNDAY_NIGHTS_FEATURED_YEARS,
  SUNDAY_NIGHTS_MONOLOGUE,
} from "@/lib/sunday-nights/article-copy";
import type { TrackPageData } from "@/lib/track/load-track-page";

import { SundayNightsLive } from "./sunday-nights-live";

type Props = {
  initialTrack: TrackPageData | null;
  initialUpdatedAt: string;
};

export function SundayNightsView({ initialTrack, initialUpdatedAt }: Props) {
  const [passNumber, setPassNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [registerStatus, setRegisterStatus] = useState<string | null>(null);
  const [registerBusy, setRegisterBusy] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegisterBusy(true);
    setRegisterStatus(null);
    try {
      const res = await fetch("/api/sunday-nights/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passNumber,
          firstName,
          lastName,
          email: email.trim() || null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setRegisterStatus(data.error ?? "Registration failed.");
        return;
      }
      setRegisterStatus("Pass registered.");
      setPassNumber("");
      setFirstName("");
      setLastName("");
      setEmail("");
    } catch {
      setRegisterStatus("Registration failed.");
    } finally {
      setRegisterBusy(false);
    }
  }

  return (
    <main className="sn-page">
      <div className="sn-top">
        <Link href="/" className="sn-site-link">
          Retroverse
        </Link>
        <SundayNightsLive
          initialTrack={initialTrack}
          initialUpdatedAt={initialUpdatedAt}
        />
      </div>

      <article className="sn-article" aria-label="Opening narration">
        {SUNDAY_NIGHTS_MONOLOGUE.map((paragraph) => (
          <p key={paragraph.slice(0, 32)} className="sn-article__p">
            {paragraph}
          </p>
        ))}
      </article>

      <section className="sn-years" aria-labelledby="sn-years-heading">
        <h2 id="sn-years-heading" className="sn-years__heading">
          Featured Years
        </h2>
        <div className="sn-years__grid">
          {SUNDAY_NIGHTS_FEATURED_YEARS.map((entry) => (
            <div key={entry.year} className="sn-years__col">
              <p className="sn-years__year">{entry.year}</p>
              <ul className="sn-years__artists">
                {entry.artists.map((artist) => (
                  <li key={artist}>{artist}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="sn-pass" aria-labelledby="sn-pass-heading">
        <h2 id="sn-pass-heading" className="sn-pass__heading">
          Collector Pass Registration
        </h2>
        <div className="sn-pass__layout">
          <div className="sn-pass__image-wrap" aria-hidden>
            <svg
              className="sn-pass__image"
              viewBox="0 0 320 480"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Numbered collector pass"
            >
              <rect width="320" height="480" fill="#f7edd8" stroke="#2a2a2a" strokeWidth="3" />
              <rect x="24" y="24" width="272" height="432" fill="none" stroke="#2a2a2a" strokeWidth="1" />
              <text
                x="160"
                y="72"
                textAnchor="middle"
                fill="#2a2a2a"
                fontFamily="Georgia, serif"
                fontSize="14"
                letterSpacing="4"
              >
                RETROVERSE
              </text>
              <text
                x="160"
                y="100"
                textAnchor="middle"
                fill="#c44a1a"
                fontFamily="Georgia, serif"
                fontSize="18"
                fontWeight="bold"
                letterSpacing="2"
              >
                SUNDAY NIGHTS
              </text>
              <text
                x="160"
                y="200"
                textAnchor="middle"
                fill="#2a2a2a"
                fontFamily="Georgia, serif"
                fontSize="12"
                letterSpacing="1"
              >
                COLLECTOR PASS
              </text>
              <text
                x="160"
                y="280"
                textAnchor="middle"
                fill="#2a2a2a"
                fontFamily="Georgia, serif"
                fontSize="48"
                fontWeight="bold"
              >
                №
              </text>
              <text
                x="160"
                y="340"
                textAnchor="middle"
                fill="#2a2a2a"
                fontFamily="Georgia, serif"
                fontSize="11"
              >
                The Main Pub · June 7, 2026
              </text>
            </svg>
          </div>
          <div className="sn-pass__form-wrap">
            <p className="sn-pass__intro">
              If you picked up a numbered collector pass tonight, you can register it here.
            </p>
            <form className="sn-pass__form" onSubmit={handleRegister}>
              <label className="sn-pass__field">
                <span>Pass Number</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={passNumber}
                  onChange={(e) => setPassNumber(e.target.value)}
                  required
                />
              </label>
              <label className="sn-pass__field">
                <span>First Name</span>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </label>
              <label className="sn-pass__field">
                <span>Last Name</span>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </label>
              <label className="sn-pass__field">
                <span>Email (optional)</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button type="submit" className="sn-pass__submit" disabled={registerBusy}>
                {registerBusy ? "Registering…" : "Register Pass"}
              </button>
              {registerStatus ? (
                <p className="sn-pass__status" role="status">
                  {registerStatus}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      </section>

      <footer className="sn-about">
        <h2 className="sn-about__heading">About Retroverse</h2>
        <p className="sn-about__text">{SUNDAY_NIGHTS_ABOUT}</p>
      </footer>
    </main>
  );
}
