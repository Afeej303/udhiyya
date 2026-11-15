import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  ArrowUpRight,
  Building2,
  Check,
  Mail,
  Pencil,
  Megaphone,
  Send,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "./DemoStore";
import { Button, btn } from "./Btn";
import { Field } from "./AuthShell";
import {
  PageTitle,
  Metrics,
  DataTable,
  Status,
  Modal,
  SelectField,
  ExportButton,
} from "./WorkflowUI";
import { platformFeatures, organisationSummary } from "@/lib/platform";
import { normalizeRow, type Row } from "@/lib/workflow";

const titles: Record<string, string> = {
  dashboard: "Your platform, at a glance.",
  organisations: "Organisations",
  access: "Admin & access",
  features: "Plans & feature access",
  settings: "Platform settings",
  support: "Support & requests",
  activity: "Platform activity & audit",
  details: "Organisation details",
};
export function SuperAdminWorkspace({
  section,
  organisationId,
}: {
  section: string;
  organisationId?: string;
}) {
  const { records, add, update, account } = useDemo();
  const navigate = useNavigate();
  const organisations = records.platformOrganisations || [];
  const admins = records.platformAdmins || [];
  const support = records.platformSupport || [];
  const activity = records.platformActivity || [];
  const notices = records.platformNotices || [];
  const settings = records.platformSettings?.[0];
  const organisation = organisations.find((o) => o.id === organisationId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [modal, setModal] = useState<string | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [features, setFeatures] = useState(platformFeatures);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Row>(() =>
    normalizeRow({ id: "draft", plan: "Community", status: "Onboarding" }),
  );
  const [created, setCreated] = useState("");
  const [reply, setReply] = useState("");
  const summary = organisationSummary(organisations);
  function audit(title: string, org: string, description: string) {
    add("platformActivity", {
      id: `AUD-${crypto.randomUUID()}`,
      title,
      organisation: org,
      description,
      name: account?.name || "Platform owner",
      date: new Date().toLocaleString("en-GB"),
      status: "Recorded",
    });
  }
  function open(type: string, row?: Row) {
    setSelected(row || null);
    setModal(type);
    setStep(0);
    setReply("");
    setCreated("");
    setDraft(
      row ? { ...row } : normalizeRow({ id: "draft", plan: "Community", status: "Onboarding" }),
    );
    setFeatures(row?.features ? row.features.split(",") : [...platformFeatures]);
  }
  function orgName(id: string) {
    return organisations.find((o) => o.id === id)?.name || "Platform";
  }
  function viewOrg(row: Row) {
    navigate({ to: "/super-admin/organisations/$id", params: { id: row.id } });
  }
  function submitOrganisation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(
      [...new FormData(e.currentTarget)].map(([k, v]) => [k, String(v)]),
    );
    const next = { ...draft, ...values };
    setDraft(next);
    if (step < 2 && !selected) {
      setStep(step + 1);
      return;
    }
    const id = selected?.id || `ORG-${crypto.randomUUID().slice(0, 8)}`;
    const patch = {
      ...next,
      features: features.join(","),
      setup: selected?.setup || "Awaiting programme setup",
      created: selected?.created || new Date().toLocaleDateString("en-GB"),
    };
    if (selected) {
      update("platformOrganisations", id, patch);
      const main = admins.find((a) => a.organisation === id && a.role === "Main Committee Admin");
      if (main)
        update("platformAdmins", main.id, { name: next.adminName, contact: next.adminContact });
      audit("Organisation updated", id, "Organisation details and access updated.");
      setModal(null);
      toast.success("Sample organisation updated");
    } else {
      add("platformOrganisations", { ...patch, id });
      add("platformAdmins", {
        id: `ADM-${crypto.randomUUID().slice(0, 8)}`,
        name: next.adminName,
        contact: next.adminContact,
        organisation: id,
        role: "Main Committee Admin",
        status: "Invited",
      });
      audit(
        "Organisation created",
        id,
        "Workspace created and main administrator invitation prepared (demo only).",
      );
      setCreated(id);
      setStep(3);
      toast.success("Sample workspace created");
    }
  }
  function toggleFeature(feature: string) {
    setFeatures((s) => (s.includes(feature) ? s.filter((f) => f !== feature) : [...s, feature]));
  }
  return (
    <>
      <PageTitle
        eyebrow="QurbaniOS · Platform owner"
        title={
          section === "details"
            ? organisation?.name || "Organisation unavailable"
            : titles[section] || "Platform dashboard"
        }
        description="Sample platform workspace · Organisation records are illustrative, not live."
        actions={
          section === "dashboard" || section === "organisations" ? (
            <Button onClick={() => open("organisation")}>
              <Plus className="size-4" />
              Create organisation
            </Button>
          ) : section === "activity" ? (
            <ExportButton rows={activity} name="platform-audit" />
          ) : undefined
        }
      />
      {(section === "dashboard" || section === "organisations") && (
        <Metrics
          items={[
            { label: "Total organisations", value: summary.total },
            { label: "Active organisations", value: summary.active },
            { label: "Onboarding / awaiting setup", value: summary.onboarding },
            { label: "Inactive / suspended", value: summary.inactive },
          ]}
        />
      )}
      {section === "dashboard" && (
        <>
          <div className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <section className="min-w-0">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Organisation pulse</h2>
                <Link
                  to="/super-admin/$section"
                  params={{ section: "organisations" }}
                  className="flex min-h-11 items-center gap-1 text-xs text-cobalt"
                >
                  View all
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
              <DataTable
                rows={organisations.slice(0, 3)}
                columns={[
                  { key: "name", label: "Organisation" },
                  { key: "locality", label: "Locality" },
                  { key: "status", label: "Status" },
                ]}
                onOpen={viewOrg}
              />
            </section>
            <section className="min-w-0">
              <h2 className="mb-4 text-xl font-bold">Needs your attention</h2>
              <div className="divide-y divide-border border-y border-border">
                {[
                  { label: "Committee admin accounts", value: admins.length, to: "access" },
                  { label: "Setup in progress", value: summary.onboarding, to: "organisations" },
                  {
                    label: "Open support requests",
                    value: support.filter((s) => s.status !== "Resolved").length,
                    to: "support",
                  },
                ].map((item) => (
                  <Link
                    key={item.label}
                    to="/super-admin/$section"
                    params={{ section: item.to }}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-5 text-sm"
                  >
                    <span>{item.label}</span>
                    <span className="font-display text-2xl font-bold text-cobalt">
                      {item.value}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <section>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold">Platform notices</h2>
                <Button variant="outline" size="sm" onClick={() => open("notice")}>
                  <Plus className="size-4" />
                  New notice
                </Button>
              </div>
              {notices.map((n) => (
                <article key={n.id} className="mb-3 rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-xs text-cobalt">
                    <Megaphone className="size-4" />
                    {n.audience}
                  </div>
                  <h3 className="mt-3 font-semibold">{n.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{n.date} · Demo notice</p>
                </article>
              ))}
            </section>
            <section>
              <h2 className="mb-4 text-xl font-bold">Recent activity</h2>
              {activity.slice(0, 4).map((a) => (
                <div key={a.id} className="border-b border-border py-4">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {orgName(a.organisation)} · {a.date}
                  </p>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
      {section === "organisations" && (
        <DataTable
          rows={organisations}
          search={search}
          onSearch={setSearch}
          filter={filter}
          onFilter={setFilter}
          columns={[
            { key: "name", label: "Organisation" },
            { key: "locality", label: "Locality" },
            { key: "adminName", label: "Main administrator" },
            { key: "plan", label: "Plan" },
            { key: "status", label: "Access status" },
          ]}
          onOpen={viewOrg}
          actions={(r) => (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Edit ${r.name}`}
              onClick={() => open("organisation", r)}
            >
              <Pencil className="size-4" />
            </Button>
          )}
        />
      )}
      {section === "details" && organisation && (
        <>
          <div className="mb-8 flex flex-wrap gap-2">
            <Status>{organisation.status}</Status>
            <Button variant="outline" size="sm" onClick={() => open("organisation", organisation)}>
              <Pencil className="size-4" />
              Edit organisation
            </Button>
            <Button variant="outline" size="sm" onClick={() => open("features", organisation)}>
              Manage features
            </Button>
          </div>
          <div className="grid gap-10 md:grid-cols-2">
            <section>
              <h2 className="mb-4 text-xl font-bold">Workspace details</h2>
              <dl className="divide-y divide-border">
                {[
                  ["Organisation reference", organisation.id],
                  ["Locality", organisation.locality],
                  ["Contact", organisation.contact],
                  ["Access plan", organisation.plan],
                  ["Setup progress", organisation.setup],
                  ["Created", organisation.created],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-4 py-4 text-sm"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <h3 className="mb-3 mt-6 font-semibold">Enabled features</h3>
              <div className="flex flex-wrap gap-2">
                {organisation.features
                  .split(",")
                  .filter(Boolean)
                  .map((f) => (
                    <Status key={f}>{f}</Status>
                  ))}
              </div>
            </section>
            <section>
              <h2 className="mb-4 text-xl font-bold">Assigned administrators</h2>
              <DataTable
                rows={admins.filter((a) => a.organisation === organisation.id)}
                columns={[
                  { key: "name", label: "Administrator" },
                  { key: "contact", label: "Contact" },
                  { key: "status", label: "Access" },
                ]}
                actions={(r) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Manage ${r.name}`}
                    onClick={() => open("admin", r)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
              />
              <Button
                className="mt-5"
                variant="outline"
                onClick={() => open("invite", organisation)}
              >
                <Mail className="size-4" />
                Invite administrator
              </Button>
            </section>
          </div>
          <section className="mt-10 border-t border-border pt-6">
            <h2 className="text-xl font-bold">Organisation activity</h2>
            {activity
              .filter((a) => a.organisation === organisation.id)
              .map((a) => (
                <div key={a.id} className="border-b border-border py-4">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {a.description} · {a.date}
                  </p>
                </div>
              ))}
          </section>
        </>
      )}
      {section === "access" && (
        <>
          <div className="mb-5">
            <Button onClick={() => open("invite")}>
              <Mail className="size-4" />
              Invite Committee Admin
            </Button>
          </div>
          <DataTable
            rows={admins.map((a) => ({ ...a, organisationName: orgName(a.organisation) }))}
            search={search}
            onSearch={setSearch}
            filter={filter}
            onFilter={setFilter}
            columns={[
              { key: "name", label: "Administrator" },
              { key: "organisationName", label: "Organisation" },
              { key: "contact", label: "Contact" },
              { key: "role", label: "Role" },
              { key: "status", label: "Access" },
            ]}
            actions={(r) => (
              <Button variant="outline" size="sm" onClick={() => open("admin", r)}>
                Manage access
              </Button>
            )}
          />
        </>
      )}
      {section === "features" && (
        <>
          <p className="mb-6 text-sm text-muted-foreground">
            Feature access only. No billing or paid subscription is connected.
          </p>
          <DataTable
            rows={organisations}
            search={search}
            onSearch={setSearch}
            columns={[
              { key: "name", label: "Organisation" },
              { key: "plan", label: "Access plan" },
              { key: "features", label: "Enabled features" },
              { key: "status", label: "Status" },
            ]}
            actions={(r) => (
              <Button variant="outline" size="sm" onClick={() => open("features", r)}>
                Configure
              </Button>
            )}
          />
        </>
      )}
      {section === "settings" && settings && (
        <form
          className="max-w-2xl space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const d = Object.fromEntries(new FormData(e.currentTarget));
            update(
              "platformSettings",
              "SETTINGS",
              Object.fromEntries(Object.entries(d).map(([k, v]) => [k, String(v)])),
            );
            audit(
              "Platform settings updated",
              "",
              "Platform defaults and service information saved.",
            );
            toast.success("Sample settings saved");
          }}
        >
          <h2 className="border-b border-border pb-4 text-xl font-bold">Service information</h2>
          <Field name="name" label="Platform name" defaultValue={settings.name} required />
          <Field
            name="contact"
            label="Support email"
            type="email"
            defaultValue={settings.contact}
            required
          />
          <SelectField
            name="status"
            label="Service status"
            defaultValue={settings.status}
            options={["Operational", "Scheduled maintenance", "Degraded service"]}
          />
          <SelectField
            name="plan"
            label="Default organisation plan"
            defaultValue={settings.plan}
            options={["Community", "Complete", "Custom"]}
          />
          <Field
            name="locality"
            label="Default time zone"
            defaultValue={settings.locality}
            required
          />
          <SelectField
            name="registration"
            label="Default registration review"
            defaultValue={settings.registration}
            options={["Committee review required", "Committee configured"]}
          />
          <Button type="submit">
            <Check className="size-4" />
            Save settings
          </Button>
        </form>
      )}
      {section === "support" && (
        <>
          <Metrics
            items={[
              { label: "Open requests", value: support.filter((s) => s.status === "Open").length },
              {
                label: "In progress",
                value: support.filter((s) => s.status === "In progress").length,
              },
              { label: "Resolved", value: support.filter((s) => s.status === "Resolved").length },
              {
                label: "High priority",
                value: support.filter((s) => s.priority === "High" && s.status !== "Resolved")
                  .length,
              },
            ]}
          />
          <DataTable
            rows={support.map((s) => ({ ...s, organisationName: orgName(s.organisation) }))}
            search={search}
            onSearch={setSearch}
            filter={filter}
            onFilter={setFilter}
            columns={[
              { key: "title", label: "Request" },
              { key: "organisationName", label: "Organisation" },
              { key: "priority", label: "Priority" },
              { key: "status", label: "Status" },
            ]}
            actions={(r) => (
              <Button variant="outline" size="sm" onClick={() => open("support", r)}>
                Review request
              </Button>
            )}
          />
        </>
      )}
      {section === "activity" && (
        <DataTable
          rows={activity.map((a) => ({ ...a, organisationName: orgName(a.organisation) }))}
          search={search}
          onSearch={setSearch}
          columns={[
            { key: "title", label: "Action" },
            { key: "organisationName", label: "Organisation" },
            { key: "name", label: "Performed by" },
            { key: "date", label: "Time" },
            { key: "description", label: "Details" },
          ]}
        />
      )}

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={
          modal === "organisation"
            ? created
              ? "Organisation created"
              : selected
                ? "Edit organisation"
                : "Create organisation"
            : modal === "features"
              ? "Plan & feature access"
              : modal === "invite"
                ? "Invite Committee Admin"
                : modal === "admin"
                  ? "Manage administrator access"
                  : modal === "support"
                    ? "Support request"
                    : "New platform notice"
        }
      >
        {modal === "organisation" &&
          (created ? (
            <div className="space-y-5">
              <span className="grid size-12 place-items-center rounded-lg bg-accent text-cobalt">
                <Check className="size-6" />
              </span>
              <p className="text-lg font-semibold">{draft.name} is ready for setup.</p>
              <p className="text-sm text-muted-foreground">
                An invitation for {draft.adminName} has been prepared in this demo. No email or
                message was sent.
              </p>
              <p className="break-all font-mono text-sm">{draft.adminContact}</p>
              <Link
                to="/super-admin/organisations/$id"
                params={{ id: created }}
                onClick={() => setModal(null)}
                className={btn({ className: "w-full" })}
              >
                Open organisation
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={submitOrganisation} className="space-y-4">
              {!selected && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {["Organisation", "Main admin", "Access"].map((s, i) => (
                      <div
                        key={s}
                        className={`border-t-2 pt-2 text-xs ${step === i ? "border-cobalt font-semibold text-cobalt" : "border-border text-muted-foreground"}`}
                      >
                        {i + 1}. {s}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">Step {step + 1} of 3</p>
                </>
              )}
              {(step === 0 || selected) && (
                <>
                  <Field name="name" label="Organisation name" defaultValue={draft.name} required />
                  <Field name="locality" label="Locality" defaultValue={draft.locality} required />
                  <Field
                    name="contact"
                    label="Organisation email or mobile"
                    defaultValue={draft.contact}
                    required
                  />
                </>
              )}
              {(step === 1 || selected) && (
                <>
                  <Field
                    name="adminName"
                    label="Main Committee Admin name"
                    defaultValue={draft.adminName}
                    required
                  />
                  <Field
                    name="adminContact"
                    label="Admin email or mobile"
                    defaultValue={draft.adminContact}
                    required
                  />
                </>
              )}
              {(step === 2 || selected) && (
                <>
                  <SelectField
                    label="Access plan"
                    value={draft.plan}
                    onChange={(v) => setDraft((s) => ({ ...s, plan: v }))}
                    options={["Community", "Complete", "Custom"]}
                  />
                  <SelectField
                    label="Organisation status"
                    value={draft.status}
                    onChange={(v) => setDraft((s) => ({ ...s, status: v }))}
                    options={["Onboarding", "Awaiting setup", "Active", "Inactive", "Suspended"]}
                  />
                  <FeatureChecks features={features} toggle={toggleFeature} />
                  <p className="text-xs text-muted-foreground">
                    Demo workspace only; no real organisation account or invitation is created.
                  </p>
                </>
              )}
              <div className="flex gap-2">
                {step > 0 && !selected && (
                  <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                    Back
                  </Button>
                )}
                <Button type="submit" className="flex-1">
                  {selected ? "Save organisation" : step === 2 ? "Create workspace" : "Continue"}
                  <ArrowUpRight className="size-4" />
                </Button>
              </div>
            </form>
          ))}
        {modal === "features" && selected && (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              const plan = String(new FormData(e.currentTarget).get("plan"));
              update("platformOrganisations", selected.id, { plan, features: features.join(",") });
              audit(
                "Feature access updated",
                selected.id,
                `${plan} plan; enabled: ${features.join(", ") || "none"}.`,
              );
              setModal(null);
              toast.success("Feature access updated in demo");
            }}
          >
            <p className="font-semibold">{selected.name}</p>
            <label className="block text-sm font-medium">
              Access plan
              <select
                name="plan"
                defaultValue={selected.plan}
                className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3"
              >
                {["Community", "Complete", "Custom"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <FeatureChecks features={features} toggle={toggleFeature} />
            <Button type="submit" className="w-full">
              Save feature access
            </Button>
          </form>
        )}
        {modal === "invite" && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              const org = String(d.get("organisation"));
              add("platformAdmins", {
                id: `ADM-${crypto.randomUUID()}`,
                name: String(d.get("name")),
                contact: String(d.get("contact")),
                organisation: org,
                role: String(d.get("role")),
                status: "Invited",
              });
              audit("Administrator invited", org, "Demo invitation prepared; no message sent.");
              setModal(null);
              toast.success("Demo invitation prepared — no message sent");
            }}
          >
            <label className="block text-sm font-medium">
              Organisation
              <select
                name="organisation"
                defaultValue={selected?.id}
                required
                className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3"
              >
                {organisations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Administrator name" name="name" required />
            <Field label="Email or mobile" name="contact" required />
            <SelectField
              name="role"
              label="Assigned role"
              options={["Committee Admin", "Finance Admin", "Read-only Admin"]}
            />
            <p className="text-xs text-muted-foreground">
              No real login or message will be created.
            </p>
            <Button className="w-full" type="submit">
              <Mail className="size-4" />
              Prepare invitation
            </Button>
          </form>
        )}
        {modal === "admin" && selected && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              update("platformAdmins", selected.id, {
                status: String(d.get("status")),
                role: String(d.get("role")),
              });
              audit(
                "Administrator access changed",
                selected.organisation,
                `Access and role updated for ${selected.name}.`,
              );
              setModal(null);
              toast.success("Sample administrator access updated");
            }}
          >
            <p className="font-semibold">{selected.name}</p>
            <p className="text-sm text-muted-foreground">{orgName(selected.organisation)}</p>
            <label className="block text-sm">
              Role
              <select
                name="role"
                defaultValue={selected.role}
                className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3"
              >
                {[
                  "Main Committee Admin",
                  "Committee Admin",
                  "Finance Admin",
                  "Read-only Admin",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Access status
              <select
                name="status"
                defaultValue={selected.status}
                className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3"
              >
                {["Active", "Invited", "Access paused"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                audit(
                  "Access reset requested",
                  selected.organisation,
                  `Demo reset prepared for ${selected.name}; no message sent.`,
                );
                toast.success("Demo reset prepared — no message sent");
              }}
            >
              <ShieldCheck className="size-4" />
              Prepare access reset
            </Button>
            <Button className="w-full" type="submit">
              Save access
            </Button>
          </form>
        )}
        {modal === "support" && selected && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const status = String(new FormData(e.currentTarget).get("status"));
              update("platformSupport", selected.id, { status, reply });
              audit(
                "Support request updated",
                selected.organisation,
                `${selected.id} marked ${status}.`,
              );
              setModal(null);
              toast.success("Sample support response saved");
            }}
          >
            <h3 className="font-semibold">{selected.title}</h3>
            <p className="text-sm text-muted-foreground">{orgName(selected.organisation)}</p>
            <p className="border-y border-border py-4 text-sm">{selected.message}</p>
            {selected.reply && (
              <p className="text-sm text-cobalt">Previous response: {selected.reply}</p>
            )}
            <label className="block text-sm font-medium">
              Response
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                required
                className="mt-2 min-h-28 w-full rounded-lg border border-border bg-card p-3"
              />
            </label>
            <label className="block text-sm">
              Request status
              <select
                name="status"
                defaultValue={selected.status}
                className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3"
              >
                {["Open", "In progress", "Resolved"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <Button className="w-full" type="submit">
              <Send className="size-4" />
              Save demo response
            </Button>
          </form>
        )}
        {modal === "notice" && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              add("platformNotices", {
                id: `NOTICE-${crypto.randomUUID()}`,
                title: String(d.get("title")),
                message: String(d.get("message")),
                audience: String(d.get("audience")),
                status: "Published",
                date: new Date().toLocaleDateString("en-GB"),
              });
              audit(
                "Platform notice published",
                "",
                "Sample service notice added to the platform dashboard.",
              );
              setModal(null);
              toast.success("Sample notice published");
            }}
          >
            <Field name="title" label="Notice title" required />
            <label className="block text-sm font-medium">
              Message
              <textarea
                name="message"
                required
                className="mt-2 min-h-28 w-full rounded-lg border border-border bg-card p-3"
              />
            </label>
            <SelectField
              name="audience"
              label="Audience"
              options={[
                "All organisations",
                "Committee administrators",
                "Onboarding organisations",
              ]}
            />
            <Button className="w-full" type="submit">
              <Megaphone className="size-4" />
              Publish demo notice
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}
function FeatureChecks({ features, toggle }: { features: string[]; toggle: (f: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium">Enabled features</legend>
      <div className="grid grid-cols-2 gap-2">
        {platformFeatures.map((f) => (
          <label
            key={f}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm"
          >
            <input
              type="checkbox"
              checked={features.includes(f)}
              onChange={() => toggle(f)}
              className="size-4 shrink-0"
            />
            <span className="min-w-0">{f}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
