"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  SUNDAY_NIGHTS_ABOUT,
  SUNDAY_NIGHTS_FEATURED_YEARS,
  SUNDAY_NIGHTS_MONOLOGUE,
} from "@/lib/sunday-nights/article-copy";
import type { SundayNightsLiveSelection } from "@/lib/sunday-nights/types";
import type { TrackPageData } from "@/lib/track/load-track-page";

import { OpsEntryLink } from "@/components/OpsEntryLink";

import { SundayNightsLive } from "./sunday-nights-live";

const VIP_PASS_SRC = "/sunday-nights/main-pub-vip-pass.png";
const VIP_PASS_ALT =
  "The Main Pub presents Sunday Nights VIP Pass for June 14, 2026, featuring artists from 1971, 1982, and 2000.";

type Props = {
  initialTrack: TrackPageData | null;
  initialLive: SundayNightsLiveSelection | null;
  initialUpdatedAt: string;
  opsEnabled: boolean;
};

export function SundayNightsView({
  initialTrack,
  initialLive,
  initialUpdatedAt,
  opsEnabled,
}: Props) {
  const [passNumber, setPassNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [registerStatus, setRegisterStatus] = useState<string | null>(null);
  const [registerBusy, setRegisterBusy] = useState(false);
  const [passLightboxOpen, setPassLightboxOpen] = useState(false);

  useEffect(() => {
    if (!passLightboxOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPassLightboxOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [passLightboxOpen]);

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
          initialLive={initialLive}
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
          <div className="sn-pass__image-wrap">
            <button
              type="button"
              className="sn-pass__image-btn"
              onClick={() => setPassLightboxOpen(true)}
              aria-label="View full-size VIP pass artwork"
            >
              <img
                src={VIP_PASS_SRC}
                alt={VIP_PASS_ALT}
                className="sn-pass__image"
                width={320}
                height={480}
                loading="lazy"
              />
            </button>
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

      {passLightboxOpen ? (
        <div
          className="sn-pass__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="VIP pass artwork"
          onClick={() => setPassLightboxOpen(false)}
        >
          <button
            type="button"
            className="sn-pass__lightbox-close"
            onClick={() => setPassLightboxOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
          <img
            src={VIP_PASS_SRC}
            alt={VIP_PASS_ALT}
            className="sn-pass__lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}

      <footer className="sn-about">
        <h2 className="sn-about__heading">About Retroverse</h2>
        <p className="sn-about__text">{SUNDAY_NIGHTS_ABOUT}</p>
        {opsEnabled ? (
          <p className="sn-about__ops">
            <OpsEntryLink className="sn-about__ops-link" next="/ops/sunday-nights" />
          </p>
        ) : null}
      </footer>
    </main>
  );
}
