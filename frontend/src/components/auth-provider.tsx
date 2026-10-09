"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  /** True until the first /me check finishes. */
  loading: boolean;
  setUser: (user: User | null) => void;
  refresh: () => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    authApi
      .me()
      .then((me) => !cancelled && setUser(me))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, setUser, refresh, logout }),
    [user, loading, refresh, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
