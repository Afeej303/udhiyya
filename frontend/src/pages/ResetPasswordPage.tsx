import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, KeyRound } from "lucide-react";
import { AuthShell, Field } from "@/components/app/AuthShell";
import { Button } from "@/components/app/Btn";
import { useAuth } from "@/services/auth";
import { toast } from "sonner";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const { updatePassword } = useAuth();
  const nav = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    const params = new URLSearchParams(window.location.search);
    const token = params.get("hash") || params.get("token") || "";
    const { error } = await updatePassword(password, token);
    setSubmitting(false);

    if (error) {
      toast.error(error.message || "Failed to update password");
      return;
    }

    setCompleted(true);
    toast.success("Password updated successfully");
  };

  if (completed) {
    return (
      <AuthShell title="Password reset complete" subtitle="Your credentials have been securely updated.">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            You can now sign in to your portal using your new password.
          </p>
          <Button
            className="mt-6 w-full"
            onClick={() => nav({ to: "/login" })}
          >
            Continue to sign in
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create new password"
      subtitle="Enter a secure password for your QurbaniOS account."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field
          label="New password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          required
        />
        <Field
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat new password"
          required
        />
        <Button className="w-full" type="submit" disabled={submitting}>
          <KeyRound className="size-4" />
          {submitting ? "Updating password…" : "Update password"}
        </Button>
        <div className="text-center pt-2">
          <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
