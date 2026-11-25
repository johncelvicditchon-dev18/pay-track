import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  login as loginWithFirebase,
  logout as logoutFromFirebase,
  observeSession,
  registerAccount,
} from "../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;

    const unsubscribe = observeSession((profile) => {
      if (!active) return;
      setUser(profile);
      setAuthReady(true);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (studentId, password, remember) => {
    const session = await loginWithFirebase(studentId, password, remember);
    setUser(session);
    return session;
  }, []);

  const signup = useCallback(async (account) => {
    try {
      return await registerAccount(account);
    } catch (error) {
      return { ok: false, error, code: error?.code || "unknown" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutFromFirebase();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, authReady, login, signup, logout }),
    [user, authReady, login, signup, logout]
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
