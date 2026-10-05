"use client";

import { useState } from "react";

type StageOnboardingProps = {
  onDismiss: (dontShowAgain: boolean) => void;
};

export function StageOnboarding({ onDismiss }: StageOnboardingProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <div className="rv-onboarding" role="dialog" aria-modal="true" aria-labelledby="rv-onboarding-title">
      <div className="rv-onboarding-scrim" aria-hidden="true" />
      <div className="rv-onboarding-panel">
        <h2 id="rv-onboarding-title" className="rv-onboarding-title">HOW TO USE THIS</h2>
        <ul className="rv-onboarding-steps">
          <li>
            <span className="rv-onboarding-icon" aria-hidden="true">↔</span>
            <div><p className="rv-onboarding-action">SWIPE RIGHT</p>
            <p className="rv-onboarding-label">Explore recommendations</p></div>
          </li>
          <li>
            <span className="rv-onboarding-icon" aria-hidden="true">←</span>
            <div><p className="rv-onboarding-action">SWIPE LEFT</p>
            <p className="rv-onboarding-label">Go back to the previous song</p></div>
          </li>
          <li>
            <span className="rv-onboarding-icon" aria-hidden="true">↑</span>
            <div><p className="rv-onboarding-action">SWIPE UP</p>
            <p className="rv-onboarding-label">Video Jukebox</p></div>
          </li>
          <li>
            <span className="rv-onboarding-icon" aria-hidden="true">↓</span>
            <div><p className="rv-onboarding-action">SWIPE DOWN</p>
            <p className="rv-onboarding-label">Explore the artist in depth</p></div>
          </li>
          <li>
            <span className="rv-onboarding-icon" aria-hidden="true">●</span>
            <div><p className="rv-onboarding-action">TAP CHAT ABOUT THIS</p>
            <p className="rv-onboarding-label">Ask about the current song</p></div>
          </li>
        </ul>
        <button
          type="button"
          className="rv-onboarding-got-it"
          onClick={() => onDismiss(dontShowAgain)}
        >
          GOT IT
        </button>
        <label className="rv-onboarding-opt-out">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.target.checked)}
          />
          <span>Don&apos;t show this again</span>
        </label>
      </div>
    </div>
  );
}
