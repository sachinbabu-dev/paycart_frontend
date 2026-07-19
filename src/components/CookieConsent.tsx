"use client";

import { useEffect, useState } from "react";
import {
  getConsent,
  setConsent,
  migrateSessionValuesToCookies,
  deleteCookie,
} from "@/lib/cookies";
import { Cookie } from "lucide-react";

const PERSISTED_KEYS = ["kaffeine-auth", "kaffeine-cart", "kaffeine-recent-orders"];

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() === null) setVisible(true);
  }, []);

  function accept() {
    setConsent("granted");
    migrateSessionValuesToCookies(PERSISTED_KEYS);
    setVisible(false);
  }

  function decline() {
    setConsent("denied");
    // Drop any persistent cookies we may have set previously.
    for (const k of PERSISTED_KEYS) deleteCookie(k);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie preferences"
      className="fixed inset-x-3 bottom-3 md:inset-x-auto md:right-6 md:bottom-6 md:max-w-md z-50"
    >
      <div className="ticket rounded-2xl p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-ember/15 text-ember-deep inline-flex items-center justify-center shrink-0">
            <Cookie className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1">
            <div className="display text-lg leading-tight">
              A quick word on cookies
            </div>
            <p className="text-sm text-ink-soft mt-1 leading-relaxed">
              We&apos;d like to store your sign-in and cart in a first-party
              cookie so you don&apos;t get logged out when you refresh. No
              tracking, no third parties. If you&apos;d rather not, we&apos;ll
              keep it in this tab only.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" className="btn-primary text-sm" onClick={accept}>
                Accept &amp; stay signed in
              </button>
              <button type="button" className="btn-ghost text-sm" onClick={decline}>
                Just this tab
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
