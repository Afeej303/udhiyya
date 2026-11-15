import { createClient, type SupabaseClient, type Session, type User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type UserRole = "super_admin" | "committee_admin" | "volunteer" | "participant";

export interface AuthUserProfile {
  id: string;
  email: string;
  role: UserRole;
  orgId?: string;
  name: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";
const isMockMode = import.meta.env.VITE_USE_MOCK_API === "true" || supabaseUrl.includes("placeholder");

export const supabase: SupabaseClient | null = !isMockMode && supabaseUrl.startsWith("http")
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Returns the current Bearer token for NestJS API requests.
 */
export async function getAuthToken(): Promise<string> {
  if (isMockMode || !supabase) {
    const stored = sessionStorage.getItem("qurbani_mock_token");
    return stored || "mock-jwt-token-super-admin";
  }
  const session = (await supabase.auth.getSession()).data.session;
  return session?.access_token || "";
}

interface AuthContextType {
  user: User | null;
  profile: AuthUserProfile | null;
  session: Session | null;
  loading: boolean;
  role: UserRole;
  signIn: (email: string, password?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchMockRole: (role: UserRole, orgId?: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthUserProfile | null>(() => {
    const cached = sessionStorage.getItem("qurbani_auth_profile");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore parse error
      }
    }
    return {
      id: "usr_super_admin",
      email: "admin@platform.qurbanios.internal",
      role: "super_admin",
      name: "Platform Owner",
    };
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const userMeta = s.user.user_metadata || {};
        const newProfile: AuthUserProfile = {
          id: s.user.id,
          email: s.user.email ?? "",
          role: (userMeta.role as UserRole) || "committee_admin",
          orgId: userMeta.org_id,
          name: userMeta.name || s.user.email?.split("@")[0] || "User",
        };
        setProfile(newProfile);
        sessionStorage.setItem("qurbani_auth_profile", JSON.stringify(newProfile));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const userMeta = s.user.user_metadata || {};
        const newProfile: AuthUserProfile = {
          id: s.user.id,
          email: s.user.email ?? "",
          role: (userMeta.role as UserRole) || "committee_admin",
          orgId: userMeta.org_id,
          name: userMeta.name || s.user.email?.split("@")[0] || "User",
        };
        setProfile(newProfile);
        sessionStorage.setItem("qurbani_auth_profile", JSON.stringify(newProfile));
      } else {
        setProfile(null);
        sessionStorage.removeItem("qurbani_auth_profile");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password = "password") => {
    setLoading(true);
    try {
      if (isMockMode || !supabase) {
        let role: UserRole = "committee_admin";
        let orgId = "org_demo";
        let name = "Committee Admin";

        if (email.includes("platform") || email.includes("super")) {
          role = "super_admin";
          orgId = "";
          name = "Platform Super Admin";
        }

        const newProfile: AuthUserProfile = {
          id: `usr_${Math.random().toString(36).substring(7)}`,
          email,
          role,
          orgId,
          name,
        };
        setProfile(newProfile);
        sessionStorage.setItem("qurbani_mock_token", `mock-bearer-${role}`);
        sessionStorage.setItem("qurbani_auth_profile", JSON.stringify(newProfile));
        setLoading(false);
        return { error: null };
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSession(data.session);
      setUser(data.user);
      return { error: null };
    } catch (err: any) {
      setLoading(false);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    sessionStorage.removeItem("qurbani_mock_token");
    sessionStorage.removeItem("qurbani_auth_profile");
  };

  const switchMockRole = (role: UserRole, orgId = "org_demo") => {
    const newProfile: AuthUserProfile = {
      id: `usr_${role}`,
      email: `${role}@qurbanios.internal`,
      role,
      orgId: role === "super_admin" ? undefined : orgId,
      name: role === "super_admin" ? "Platform Owner" : "Mahallu Admin",
    };
    setProfile(newProfile);
    sessionStorage.setItem("qurbani_mock_token", `mock-bearer-${role}`);
    sessionStorage.setItem("qurbani_auth_profile", JSON.stringify(newProfile));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        role: profile?.role || "participant",
        signIn,
        signOut,
        switchMockRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
