import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ShieldCheck, Users, HandHeart, UserRound } from "lucide-react";
import { AuthShell, Field } from "@/components/app/AuthShell";
import { Button } from "@/components/app/Btn";
import { useParticipant } from "@/components/app/ParticipantSession";
import { useDemo } from "@/components/app/DemoStore";
import { useAuth } from "@/services/auth";
import { demoAccounts } from "@/lib/workflow";
import { toast } from "sonner";

export function LoginPage() {
  const [role, setRole] = useState("Participant");
  const [selected, setSelected] = useState("Yusuf Ahmed");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { enter } = useParticipant();
  const { login } = useDemo();
  const { signIn, switchMockRole } = useAuth();
  const nav = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (role === "Participant") {
      enter({
        name: "Mohammed Ashraf",
        email: email || "participant@example.test",
        activity: "Cattle share",
        household: "QBH-00125",
        shares: 1,
        reference: "QOS-2027-001",
        status: "Pending review",
      });
      switchMockRole("participant");
      toast.success("Welcome, Participant!");
      nav({ to: "/programme" });
    } else {
      const a = demoAccounts.find(
        (acc) => acc.role === role && (role !== "Volunteer" || acc.name === selected),
      );
      if (!a) return;
      login(a);

      if (role === "Super Admin") {
        switchMockRole("super_admin");
        toast.success("Signed in as Platform Super Admin");
        nav({ to: "/super-admin/$section", params: { section: "organisations" } });
      } else if (role === "Committee") {
        switchMockRole("committee_admin", "org_demo");
        toast.success("Signed in as Committee Admin");
        nav({ to: "/admin/$section", params: { section: "programme-setup" } });
      } else {
        toast.success(`Signed in as ${role}`);
        nav({ to: "/programme" });
      }
    }
  };

  return (
    <AuthShell title="Assalamu Alaikum." subtitle="Welcome back to your community programme.">
      <div className="mb-6 grid grid-cols-2 gap-2">
        {[
          { name: "Participant", icon: UserRound },
          { name: "Committee", icon: ShieldCheck },
          { name: "Volunteer", icon: Users },
          { name: "Beneficiary", icon: HandHeart },
          { name: "Super Admin", icon: ShieldCheck },
        ].map((r) => (
          <Button
            key={r.name}
            type="button"
            variant={role === r.name ? "ink" : "outline"}
            size="sm"
            className={r.name === "Super Admin" ? "col-span-2" : ""}
            onClick={() => {
              setRole(r.name);
              if (r.name === "Super Admin") {
                setEmail("admin@platform.qurbanios.internal");
              } else if (r.name === "Committee") {
                setEmail("office@example.test");
              }
            }}
          >
            <r.icon className="size-4" />
            {r.name}
          </Button>
        ))}
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {role === "Volunteer" && (
          <label className="block text-sm font-medium">
            Committee-assigned demo account
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3"
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
          label={
            role === "Beneficiary"
              ? "Beneficiary reference or registered contact"
              : "Mobile number or email"
          }
          name="contact"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={role === "Beneficiary" ? "QBH-00125" : "Your mobile or email"}
          required
        />
        <Field
          label={role === "Beneficiary" ? "Verification code — sample" : "Password — sample"}
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Any sample value"
          required
        />
        <Button className="w-full" type="submit">
          Open {role.toLowerCase()} portal
          <ArrowRight className="size-4" />
        </Button>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Demo access mode active. Bearer token simulated with role-based JWT payload for local NestJS API consumption.
        </p>
      </form>
    </AuthShell>
  );
}
