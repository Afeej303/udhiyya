import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Users,
  UserRound,
  KeyRound,
  Mail,
  UserPlus,
  LogIn,
} from "lucide-react";
import { AuthShell, Field } from "@/components/app/AuthShell";
import { Button } from "@/components/app/Btn";
import { useParticipant } from "@/components/app/ParticipantSession";
import { useDemo } from "@/components/app/DemoStore";
import { useAuth, type UserRole } from "@/services/auth";
import { GoogleSignIn } from "@/services/auth/GoogleSignIn";
import { demoAccounts } from "@/lib/workflow";
import { toast } from "sonner";

type AuthMode = "signin" | "signup" | "forgot";

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [role, setRole] = useState("Participant");
  const [selectedVolunteer, setSelectedVolunteer] = useState("Yusuf Ahmed");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { enter } = useParticipant();
  const { login } = useDemo();
  const { signIn, signUp, resetPassword, switchMockRole, isConfigured } = useAuth();
  const nav = useNavigate();

  const handleRoleSelect = (rName: string) => {
    setRole(rName);
    if (rName === "Super Admin") {
      setEmail("admin@platform.qurbanios.internal");
    } else if (rName === "Committee") {
      setEmail("office@example.test");
    } else if (rName === "Volunteer") {
      setEmail("volunteer@example.test");
    } else {
      setEmail("participant@example.test");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 1. Forgot password flow
      if (mode === "forgot") {
        const { error } = await resetPassword(email);
        setSubmitting(false);
        if (error) {
          toast.error(error.message || "Failed to send reset link");
        } else {
          toast.success("Password reset link sent to your email.");
          setMode("signin");
        }
        return;
      }

      // 2. Sign up flow
      if (mode === "signup") {
        const targetRole: UserRole =
          role === "Super Admin"
            ? "super_admin"
            : role === "Committee"
              ? "committee_admin"
              : role === "Volunteer"
                ? "volunteer"
                : "participant";

        const { error, user } = await signUp(email, password, {
          name: fullName || email.split("@")[0],
          role: targetRole,
          org_id: targetRole === "super_admin" ? undefined : "org_demo",
        });

        setSubmitting(false);
        if (error) {
          toast.error(error.message || "Sign up failed");
          return;
        }

        toast.success(
          user && !user.confirmed_at
            ? "Account created! Please check your email to confirm registration."
            : "Account registered and logged in!",
        );

        // Direct to portal
        redirectForRole(targetRole);
        return;
      }

      // 3. Sign in flow (live Supabase or demo)
      const { error, profile } = await signIn(email, password);
      setSubmitting(false);

      if (error) {
        toast.error(error.message || "Invalid credentials");
        return;
      }

      const activeRole = profile?.role || "participant";
      toast.success(`Welcome back, ${profile?.name || activeRole}!`);

      // Also sync DemoStore for seamless backward-compatibility
      syncDemoState(role, email);

      redirectForRole(activeRole);
    } catch (err: any) {
      setSubmitting(false);
      toast.error(err.message || "An unexpected authentication error occurred");
    }
  };

  const syncDemoState = (roleName: string, userEmail: string) => {
    if (roleName === "Participant") {
      enter({
        name: "Mohammed Ashraf",
        email: userEmail || "participant@example.test",
        activity: "Cattle share",
        household: "QBH-00125",
        shares: 1,
        reference: "QOS-2027-001",
        status: "Pending review",
      });
      switchMockRole("participant");
    } else {
      const a = demoAccounts.find(
        (acc) => acc.role === roleName && (roleName !== "Volunteer" || acc.name === selectedVolunteer),
      );
      if (a) {
        login(a);
      }
    }
  };

  const redirectForRole = (r: UserRole) => {
    switch (r) {
      case "super_admin":
        nav({ to: "/super-admin/$section", params: { section: "organisations" } });
        break;
      case "committee_admin":
        nav({ to: "/admin/$section", params: { section: "dashboard" } });
        break;
      case "volunteer":
        nav({ to: "/volunteer/$section", params: { section: "home" } });
        break;
      case "participant":
      default:
        nav({ to: "/participant/$section", params: { section: "overview" } });
        break;
    }
  };

  return (
    <AuthShell
      title="Assalamu Alaikum."
      subtitle={
        mode === "signin"
          ? "Welcome back to your community programme."
          : mode === "signup"
            ? "Register a new participant or volunteer account."
            : "Reset your QurbaniOS account password."
      }
    >
      {/* Mode Tabs */}
      <div className="mb-6 flex rounded-lg border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
            mode === "signin"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LogIn className="mr-1.5 inline size-3.5" />
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
            mode === "signup"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserPlus className="mr-1.5 inline size-3.5" />
          Register
        </button>
        <button
          type="button"
          onClick={() => setMode("forgot")}
          className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
            mode === "forgot"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <KeyRound className="mr-1.5 inline size-3.5" />
          Recovery
        </button>
      </div>

      {/* Quick Role Selection Buttons */}
      {mode !== "forgot" && (
        <div className="mb-6">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">Select role target / demo account:</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: "Participant", icon: UserRound },
              { name: "Committee", icon: ShieldCheck },
              { name: "Volunteer", icon: Users },
              { name: "Super Admin", icon: ShieldCheck },
            ].map((r) => (
              <Button
                key={r.name}
                type="button"
                variant={role === r.name ? "ink" : "outline"}
                size="sm"
                className=""
                onClick={() => handleRoleSelect(r.name)}
              >
                <r.icon className="size-4" />
                {r.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Authentication Form */}
      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "signup" && (
          <Field
            label="Full name"
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Yusuf Ahmed"
            required
          />
        )}

        {role === "Volunteer" && mode === "signin" && (
          <label className="block text-sm font-medium">
            Assigned volunteer profile
            <select
              value={selectedVolunteer}
              onChange={(e) => setSelectedVolunteer(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
            >
              {demoAccounts
                .filter((a) => a.role === "Volunteer")
                .map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name} · {a.department}
                  </option>
                ))}
            </select>
          </label>
        )}

        <Field
          label="Email address"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@example.com"
          required
        />

        {mode !== "forgot" && (
          <Field
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isConfigured ? "Enter your password" : "Enter password (or sample value)"}
            required
          />
        )}

        <Button className="w-full" type="submit" disabled={submitting}>
          {submitting ? (
            "Authenticating…"
          ) : mode === "signin" ? (
            <>
              Open {role.toLowerCase()} portal
              <ArrowRight className="size-4" />
            </>
          ) : mode === "signup" ? (
            <>
              Create account
              <ArrowRight className="size-4" />
            </>
          ) : (
            <>
              Send recovery email
              <Mail className="size-4" />
            </>
          )}
        </Button>

        {mode === "signin" && (
          <div className="pt-2">
            <div className="relative my-3 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <span className="relative bg-card px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                or
              </span>
            </div>
            <GoogleSignIn
              onSuccess={() => {
                redirectForRole("participant");
              }}
            />
          </div>
        )}

        <div className="flex items-center justify-between text-xs pt-1">
          {mode === "signin" ? (
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-muted-foreground hover:text-foreground"
            >
              Back to sign in
            </button>
          )}
          <span className="text-muted-foreground text-[11px]">
            {isConfigured ? "Supabase Auth active" : "Demo Simulation mode"}
          </span>
        </div>
      </form>
    </AuthShell>
  );
}
