"use client";

const DEFAULT_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const CONSENT_COOKIE = "kaffeine-consent";

export type Consent = "granted" | "denied";

export function setCookie(name: string, value: string, maxAge = DEFAULT_MAX_AGE) {
  if (typeof document === "undefined") return;
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "path=/",
    `max-age=${maxAge}`,
    "SameSite=Lax",
  ];
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    parts.push("Secure");
  }
  document.cookie = parts.join("; ");
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const target = name + "=";
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(target));
  if (!raw) return null;
  return decodeURIComponent(raw.slice(target.length));
}

export function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function getConsent(): Consent | null {
  const v = getCookie(CONSENT_COOKIE);
  return v === "granted" || v === "denied" ? v : null;
}

export function setConsent(v: Consent) {
  setCookie(CONSENT_COOKIE, v);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("kaffeine:consent", { detail: v }));
  }
}

// A synchronous Web-Storage-shaped adapter that Zustand's persist middleware
// can consume via `createJSONStorage(() => cookieBackedStorage)`. Uses a cookie
// when consent is granted; otherwise falls back to sessionStorage so the token
// still survives a refresh but not a tab close.
export const cookieBackedStorage: Storage = {
  length: 0,
  clear() {},
  key() {
    return null;
  },
  getItem(name) {
    const consent = getConsent();
    if (consent === "granted") {
      const cookie = getCookie(name);
      if (cookie !== null) return cookie;
    }
    if (typeof sessionStorage !== "undefined") {
      return sessionStorage.getItem(name);
    }
    return null;
  },
  setItem(name, value) {
    const consent = getConsent();
    if (consent === "granted") {
      setCookie(name, value);
      if (typeof sessionStorage !== "undefined") {
        // keep sessionStorage in sync so a consent revocation still finds the value
        sessionStorage.setItem(name, value);
      }
      return;
    }
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(name, value);
  },
  removeItem(name) {
    deleteCookie(name);
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(name);
  },
};

// When the user grants consent after already signing in, promote whatever we
// have in sessionStorage into a persistent cookie so the next refresh keeps
// them logged in.
export function migrateSessionValuesToCookies(names: string[]) {
  if (typeof sessionStorage === "undefined") return;
  for (const name of names) {
    const value = sessionStorage.getItem(name);
    if (value) setCookie(name, value);
  }
}
