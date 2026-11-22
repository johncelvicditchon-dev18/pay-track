import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  authenticate,
  clearSession,
  persistSession,
  readSession,
  registerAccount,
} from "../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession());

  const login = useCallback((email, password, remember) => {
    const account = authenticate(email, password);
    if (!account) return null;

    const session = persistSession(account, remember);
    setUser(session);
    return session;
  }, []);

  const signup = useCallback((account) => registerAccount(account), []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, signup, logout }),
    [user, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
