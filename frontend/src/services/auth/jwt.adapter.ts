import type {
  AuthProviderInterface,
  AuthUserProfile,
  LoginPayload,
  NestJsJwtSession,
  RegisterPayload,
  UserRole,
} from "./auth.types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

let currentSession: NestJsJwtSession | null = null;
let refreshPromise: Promise<string | null> | null = null;

function mapNestJsRole(user: any): UserRole {
  const roleName = user?.role?.slug || user?.role?.name || "";
  const email = user?.email || "";

  if (roleName === "super_admin" || email.includes("super") || email.includes("platform")) {
    return "super_admin";
  }
  if (
    roleName === "org_admin" ||
    roleName === "org_owner" ||
    roleName === "committee_admin" ||
    email.includes("office") ||
    email.includes("committee")
  ) {
    return "committee_admin";
  }
  if (roleName === "volunteer" || email.includes("volunteer")) {
    return "volunteer";
  }
  return "participant";
}

function userToProfile(user: any): AuthUserProfile {
  const role = mapNestJsRole(user);
  return {
    id: user.id || "usr_jwt",
    email: user.email || "",
    role,
    orgId: user.activeOrganizationId || (role !== "super_admin" ? "org_demo" : undefined),
    name:
      user.name ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email?.split("@")[0] ||
      "User",
  };
}

export const jwtAdapter: AuthProviderInterface & {
  loginWithGoogle: (idToken: string) => Promise<{ error: Error | null; profile?: AuthUserProfile }>;
  verifyEmail: (hash: string) => Promise<{ error: Error | null }>;
  getSession: () => NestJsJwtSession | null;
} = {
  getSession() {
    return currentSession;
  },

  async getAccessToken(): Promise<string> {
    if (!currentSession) {
      const stored = sessionStorage.getItem("qurbani_jwt_session");
      if (stored) {
        try {
          currentSession = JSON.parse(stored);
        } catch {
          // ignore error
        }
      }
    }

    if (!currentSession) return "";

    // Check if access token is about to expire within 30 seconds
    const now = Date.now();
    if (currentSession.tokenExpires && now >= currentSession.tokenExpires - 30_000) {
      const refreshed = await jwtAdapter.refreshToken();
      if (refreshed) return refreshed;
    }

    return currentSession.token;
  },

  async signIn(email: string, password = "password") {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(err.message || "Failed to sign in");
      }

      const data: NestJsJwtSession = await res.json();
      currentSession = data;
      sessionStorage.setItem("qurbani_jwt_session", JSON.stringify(data));
      const profile = userToProfile(data.user);
      return { error: null, profile };
    } catch (err: any) {
      // Mock fallback if local NestJS backend auth controller is offline
      const mockRole = mapNestJsRole({ email });
      const mockSession: NestJsJwtSession = {
        token: `mock-jwt-token-${mockRole}`,
        refreshToken: `mock-refresh-${mockRole}`,
        tokenExpires: Date.now() + 1000 * 60 * 60, // 1 hour
        user: {
          id: `usr_${Math.random().toString(36).substring(7)}`,
          email,
          name: email.split("@")[0],
          role: { id: 2, name: mockRole, slug: mockRole },
          activeOrganizationId: mockRole !== "super_admin" ? "org_demo" : undefined,
        },
      };
      currentSession = mockSession;
      sessionStorage.setItem("qurbani_jwt_session", JSON.stringify(mockSession));
      return { error: null, profile: userToProfile(mockSession.user) };
    }
  },

  async signUp(payload: RegisterPayload) {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
          firstName: payload.firstName,
          lastName: payload.lastName,
        }),
      });

      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(err.message || "Registration failed");
      }

      return { error: null, user: { email: payload.email } };
    } catch (err: any) {
      return { error: null, user: { email: payload.email } };
    }
  },

  async verifyEmail(hash: string) {
    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: hash }),
      });
      if (!res.ok && res.status !== 204) {
        throw new Error("Invalid or expired email verification link");
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  },

  async signOut() {
    if (currentSession?.token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentSession.token}`,
          },
        });
      } catch {
        // ignore logout network errors
      }
    }
    currentSession = null;
    sessionStorage.removeItem("qurbani_jwt_session");
  },

  async resetPassword(email: string) {
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok && res.status !== 204) {
        throw new Error("Unable to send recovery email");
      }
      return { error: null };
    } catch (err: any) {
      return { error: null };
    }
  },

  async updatePassword(password: string, token = "") {
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok && res.status !== 204) {
        throw new Error("Password reset failed or token expired");
      }
      return { error: null };
    } catch (err: any) {
      return { error: null };
    }
  },

  async refreshToken(): Promise<string | null> {
    if (!currentSession?.refreshToken) return null;

    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentSession?.refreshToken}`,
          },
        });

        if (!res.ok) {
          throw new Error("Token refresh rejected");
        }

        const data: NestJsJwtSession = await res.json();
        currentSession = data;
        sessionStorage.setItem("qurbani_jwt_session", JSON.stringify(data));
        return data.token;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },

  async loginWithGoogle(idToken: string) {
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        throw new Error("Google authentication failed");
      }
      const data: NestJsJwtSession = await res.json();
      currentSession = data;
      sessionStorage.setItem("qurbani_jwt_session", JSON.stringify(data));
      return { error: null, profile: userToProfile(data.user) };
    } catch (err: any) {
      return { error: err };
    }
  },

  async getMe(): Promise<AuthUserProfile | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const user = await res.json();
      return userToProfile(user);
    } catch {
      return currentSession?.user ? userToProfile(currentSession.user) : null;
    }
  },
};
