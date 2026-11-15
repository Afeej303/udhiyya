import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, Plus, CalendarDays, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, btn } from "./Btn";
import { Field } from "./AuthShell";
import { Status, Modal } from "./WorkflowUI";
import { programmeApi } from "@/services/api";
import type { Programme, ApiError } from "@/types/api";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";
import { EmptyState } from "../common/EmptyState";

export function ProgrammeSetupSection({ orgId = "org_demo" }: { orgId?: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [selectedProgramme, setSelectedProgramme] = useState<Programme | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [guidelines, setGuidelines] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [limit, setLimit] = useState<number | "">("");
  const [priceRupees, setPriceRupees] = useState<number | "">("");

  // Action states
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear() + 1);
  const [newTitle, setNewTitle] = useState("Annual Aḍḥiyah Programme");

  const loadProgrammes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await programmeApi.list(orgId);
      setProgrammes(res.items);
      if (res.items.length > 0) {
        selectProgramme(res.items[0]);
      } else {
        setSelectedProgramme(null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load programmes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgrammes();
  }, [orgId]);

  const selectProgramme = (prog: Programme) => {
    setSelectedProgramme(prog);
    setTitle(prog.title || "");
    setDescription(prog.description || "");
    setGuidelines(prog.guidelines || "");
    setContactEmail(prog.publicContact?.email || "");

    // Format ISO string to datetime-local input (YYYY-MM-DDTHH:mm)
    if (prog.registrationOpensAt) {
      try {
        const d = new Date(prog.registrationOpensAt);
        setOpensAt(d.toISOString().slice(0, 16));
      } catch {
        setOpensAt("");
      }
    } else {
      setOpensAt("");
    }

    if (prog.registrationClosesAt) {
      try {
        const d = new Date(prog.registrationClosesAt);
        setClosesAt(d.toISOString().slice(0, 16));
      } catch {
        setClosesAt("");
      }
    } else {
      setClosesAt("");
    }

    setLimit(prog.registrationLimit ?? "");
    setPriceRupees(prog.price ? Math.round(prog.price.amountMinor / 100) : "");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      const created = await programmeApi.create(orgId, {
        year: Number(newYear),
        title: newTitle.trim(),
      });
      toast.success(`Programme for ${created.year} created successfully`);
      setCreateModal(false);
      setProgrammes((prev) => [created, ...prev]);
      selectProgramme(created);
    } catch (err: any) {
      if (err.code === "PROGRAMME_YEAR_EXISTS" || err.statusCode === 409) {
        toast.error("A programme already exists for this year in this organisation");
      } else {
        toast.error(Array.isArray(err.message) ? err.message.join(", ") : err.message || "Failed to create programme");
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgramme) return;

    if (!title.trim()) {
      toast.error("Title cannot be blank");
      return;
    }

    setSaving(true);
    try {
      const updated = await programmeApi.update(orgId, selectedProgramme.id, {
        title: title.trim(),
        description: description.trim() || null,
        guidelines: guidelines.trim() || null,
        publicContact: contactEmail.trim() ? { email: contactEmail.trim() } : null,
        registrationOpensAt: opensAt ? new Date(opensAt).toISOString() : null,
        registrationClosesAt: closesAt ? new Date(closesAt).toISOString() : null,
        registrationLimit: limit !== "" ? Number(limit) : null,
        price: priceRupees !== "" ? { amountMinor: Number(priceRupees) * 100, currency: "INR" } : null,
      });

      setSelectedProgramme(updated);
      setProgrammes((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success("Programme settings saved successfully");
    } catch (err: any) {
      toast.error(Array.isArray(err.message) ? err.message.join(", ") : err.message || "Failed to update programme");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedProgramme) return;

    // Pre-flight check according to API contract rules
    if (!description.trim()) {
      toast.error("Description is required before publishing");
      return;
    }
    if (!guidelines.trim()) {
      toast.error("Guidelines are required before publishing");
      return;
    }
    if (!contactEmail.trim()) {
      toast.error("Public contact email is required before publishing");
      return;
    }
    if (!opensAt || !closesAt) {
      toast.error("Registration opening and closing dates are required before publishing");
      return;
    }
    if (new Date(closesAt) <= new Date(opensAt)) {
      toast.error("Registration closing date must follow opening date");
      return;
    }
    if (limit === "" || Number(limit) <= 0) {
      toast.error("Positive registration limit is required before publishing");
      return;
    }
    if (priceRupees === "" || Number(priceRupees) < 0) {
      toast.error("Valid share price is required before publishing");
      return;
    }

    setPublishing(true);
    try {
      // First save current form changes
      await programmeApi.update(orgId, selectedProgramme.id, {
        title: title.trim(),
        description: description.trim(),
        guidelines: guidelines.trim(),
        publicContact: { email: contactEmail.trim() },
        registrationOpensAt: new Date(opensAt).toISOString(),
        registrationClosesAt: new Date(closesAt).toISOString(),
        registrationLimit: Number(limit),
        price: { amountMinor: Number(priceRupees) * 100, currency: "INR" },
      });

      // Then call publish endpoint
      const published = await programmeApi.publish(orgId, selectedProgramme.id);
      setSelectedProgramme(published);
      setProgrammes((prev) => prev.map((p) => (p.id === published.id ? published : p)));
      toast.success("Programme published successfully! Registrations are now active.");
    } catch (err: any) {
      toast.error(Array.isArray(err.message) ? err.message.join(", ") : err.message || "Failed to publish programme");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <LoadingState message="Connecting to programme service..." />;
  }

  if (error) {
    return <ErrorState title="Programme setup unavailable" message={error} onRetry={loadProgrammes} />;
  }

  if (programmes.length === 0) {
    return (
      <EmptyState
        title="No programme created yet"
        description="Start this year's Aḍḥiyah programme for your organisation to configure pricing, guidelines and public visibility."
        actionLabel="Create Programme"
        onAction={() => setCreateModal(true)}
      />
    );
  }

  const isPublished = selectedProgramme?.status === "published";

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Status>{isPublished ? "Published" : "Draft"}</Status>
          {programmes.length > 1 && (
            <select
              value={selectedProgramme?.id}
              onChange={(e) => {
                const p = programmes.find((item) => item.id === e.target.value);
                if (p) selectProgramme(p);
              }}
              className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium"
            >
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.year} · {p.title} ({p.status})
                </option>
              ))}
            </select>
          )}
          <Link to="/programme" className={btn({ variant: "outline", size: "sm" })}>
            <Eye className="size-4" />
            Preview public information
          </Link>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCreateModal(true)}>
          <Plus className="size-4" />
          New year programme
        </Button>
      </div>

      <form className="grid w-full min-w-0 max-w-4xl gap-8" onSubmit={handleSave}>
        <section className="min-w-0">
          <h2 className="mb-5 text-lg font-bold">Basic information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Field
                label="Programme title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div>
              <Field
                label="Programme year (immutable)"
                value={String(selectedProgramme?.year || "")}
                disabled
                className="opacity-70 bg-muted cursor-not-allowed"
              />
            </div>
            <div>
              <Field
                label="Public contact email"
                type="email"
                placeholder="programme@example.test"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                maxLength={254}
                required={isPublished}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Publicly displayed for resident enquiries (distinct from private org contact).
              </p>
            </div>
            <div>
              <Field
                label="Registration limit (capacity)"
                type="number"
                min={1}
                placeholder="e.g. 150"
                value={limit}
                onChange={(e) => setLimit(e.target.value ? Number(e.target.value) : "")}
                required={isPublished}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Total participation spots available before registration closes.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-border pt-6">
          <h2 className="mb-5 text-lg font-bold">Schedule & contribution pricing</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Field
                label="Registration opens at (UTC)"
                type="datetime-local"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
                required={isPublished}
              />
            </div>
            <div>
              <Field
                label="Registration closes at (UTC)"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                required={isPublished}
              />
            </div>
            <div>
              <Field
                label="Share contribution (₹ INR)"
                type="number"
                min={0}
                step={1}
                placeholder="e.g. 8500"
                value={priceRupees}
                onChange={(e) => setPriceRupees(e.target.value ? Number(e.target.value) : "")}
                required={isPublished}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Stored in minor units ({Number(priceRupees || 0) * 100} paise).
              </p>
            </div>
            <div className="flex flex-col justify-center rounded-lg border border-border bg-card/60 p-4">
              <span className="text-xs text-muted-foreground">Currency</span>
              <span className="mt-1 text-sm font-semibold">INR (₹) · Confirmed</span>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium">
              Programme description (public)
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border border-border bg-card p-3 text-sm focus:border-cobalt focus:ring-2 focus:ring-ring/20 outline-none"
                placeholder="Programme overview and mission for local residents..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={10000}
                required={isPublished}
              />
            </label>

            <label className="block text-sm font-medium">
              Participation guidelines (public)
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border border-border bg-card p-3 text-sm focus:border-cobalt focus:ring-2 focus:ring-ring/20 outline-none"
                placeholder="Instructions, eligibility, and payment terms..."
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
                maxLength={10000}
                required={isPublished}
              />
            </label>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save programme"
            )}
          </Button>

          {!isPublished ? (
            <Button
              type="button"
              variant="ink"
              disabled={publishing || saving}
              onClick={handlePublish}
            >
              {publishing ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Publishing...
                </>
              ) : (
                "Publish & open registration"
              )}
            </Button>
          ) : (
            <div className="inline-flex items-center gap-2 text-xs font-medium text-cobalt px-3 py-2 bg-accent/40 rounded-lg">
              <CheckCircle2 className="size-4" />
              Programme is live on public portal
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Connected to NestJS backend routes under <code className="font-mono">/organisations/{orgId}/programmes</code>.
          Changes are persisted in the database with serializable transaction isolation.
        </p>
      </form>

      {createModal && (
        <Modal
          open={createModal}
          title="Create annual programme"
          onClose={() => setCreateModal(false)}
        >
          <form className="space-y-4" onSubmit={handleCreate}>
            <Field
              label="Year (1900–9999)"
              type="number"
              min={1900}
              max={9999}
              value={newYear}
              onChange={(e) => setNewYear(Number(e.target.value))}
              required
            />
            <Field
              label="Programme title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={200}
              required
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Create draft</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
