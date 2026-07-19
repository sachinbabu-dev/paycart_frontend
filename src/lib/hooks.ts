"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./stores";

// Zustand's persist middleware rehydrates in an effect on the client. Any
// component that gates on `token` needs to wait for this to finish, otherwise
// it'll see the default `null` on first render and bounce the user to /auth
// even though a valid session is sitting in the cookie.
export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    useAuth.persist.hasHydrated(),
  );
  useEffect(() => {
    const unsubFinish = useAuth.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    // In case hydration finished between initial state read and this effect.
    if (useAuth.persist.hasHydrated()) setHydrated(true);
    return unsubFinish;
  }, []);
  return hydrated;
}
