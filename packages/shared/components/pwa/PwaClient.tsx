"use client";

import { useEffect, useState } from "react";

import "./pwa-install.css";

const DISMISS_KEY = "rv-pwa-install-dismissed";
const SW_PATH = "/sw.js";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches
  );
}

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const chromeIos = /CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && !chromeIos;
}

async function registerPwaWorker() {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map((registration) => {
      const script =
        registration.active?.scriptURL ||
        registration.waiting?.scriptURL ||
        registration.installing?.scriptURL ||
        "";
      if (script.endsWith(SW_PATH)) return Promise.resolve(false);
      return registration.unregister();
    }),
  );

  await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
}

export function PwaClient() {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    void registerPwaWorker().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (isStandaloneDisplay()) return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      return;
    }

    setIosHint(isIosSafari());
    setVisible(true);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore quota / private mode
    }
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      // ignore
    }
    setDeferred(null);
    dismiss();
  }

  if (!visible) return null;

  return (
    <aside className="rv-pwa-install" role="dialog" aria-label="Install Retroverse">
      <div className="rv-pwa-install__mark" aria-hidden="true">
        R
      </div>
      <div className="rv-pwa-install__body">
        <p className="rv-pwa-install__title">Install Retroverse</p>
        <p className="rv-pwa-install__copy">
          Get the full-screen experience.
          {iosHint ? " Use Share → Add to Home Screen." : null}
        </p>
        <div className="rv-pwa-install__actions">
          {deferred ? (
            <button type="button" className="rv-pwa-install__btn rv-pwa-install__btn--primary" onClick={() => void install()}>
              Install
            </button>
          ) : null}
          <button type="button" className="rv-pwa-install__btn rv-pwa-install__btn--ghost" onClick={dismiss}>
            Not now
          </button>
        </div>
      </div>
      <button type="button" className="rv-pwa-install__dismiss" aria-label="Dismiss" onClick={dismiss}>
        ×
      </button>
    </aside>
  );
}
