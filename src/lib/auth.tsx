import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  getSessionFn,
  getStoredAuthToken,
  logoutFn,
  setStoredAuthToken,
  type AuthSessionResponse,
} from "@/fns/auth";

type Role = "admin" | "client" | "parceiro";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

interface AuthCtx {
  user: AuthUser | null;
  role: Role | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

function toAuthUser(user: NonNullable<AuthSessionResponse["user"]>): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      const token = getStoredAuthToken();
      if (!token) {
        if (!active) return;
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { user: sessionUser } = await getSessionFn({ data: { token } });
        if (!active) return;

        if (!sessionUser) {
          setStoredAuthToken(null);
          setUser(null);
          setRole(null);
        } else {
          setUser(toAuthUser(sessionUser));
          setRole(sessionUser.role);
        }
      } catch (error) {
        console.error("Erro ao carregar sessão", error);
        if (!active) return;
        setStoredAuthToken(null);
        setUser(null);
        setRole(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadSession();

    const onAuthChange = () => {
      setLoading(true);
      loadSession();
    };

    window.addEventListener("pallazium-auth-change", onAuthChange);
    return () => {
      active = false;
      window.removeEventListener("pallazium-auth-change", onAuthChange);
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        role,
        loading,
        signOut: async () => {
          const token = getStoredAuthToken();
          if (token) await logoutFn({ data: { token } });
          setStoredAuthToken(null);
          setUser(null);
          setRole(null);
          window.dispatchEvent(new Event("pallazium-auth-change"));
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

export function notifyAuthChange() {
  window.dispatchEvent(new Event("pallazium-auth-change"));
}
