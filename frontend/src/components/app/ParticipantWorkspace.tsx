import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { useParticipant } from "./ParticipantSession";
import { useDemo } from "./DemoStore";
import { PageTitle, Metrics, Timeline, Status, DataTable, Modal, SelectField } from "./WorkflowUI";
import { Button, btn } from "./Btn";
import { Field } from "./AuthShell";
import { money, sample, verifiedBalance } from "@/lib/workflow";
export const participantSections = [
  { slug: "registration", label: "My registration" },
  { slug: "household", label: "Household" },
  { slug: "participation", label: "Participation" },
  { slug: "payments", label: "Payments & receipts" },
  { slug: "allocation", label: "Group allocation" },
  { slug: "collection", label: "My collection" },
  { slug: "updates", label: "Updates" },
  { slug: "profile", label: "Profile & support" },
];
export function ParticipantWorkspace({ section }: { section: string }) {
  const { participant, enter } = useParticipant();
  const { records, add } = useDemo();
  const [payment, setPayment] = useState(false);
  if (!participant) return null;
  const reference = participant.reference || "QOS-2027-001";
  const registration = records.participants.find((p) => p.id === reference);
  const status = registration?.status || participant.status || "Pending review";
  const shares = Number(registration?.shares || participant.shares || 1);
  const contribution = shares * sample.price;
  const verified = verifiedBalance(records.payments, reference);
  const group = records.groups.find(
    (g) => g.status === "Published" && g.participants.split(",").includes(reference),
  );
  const packageRow = records.distribution.find(
    (d) => d.recipient === reference && d.status !== "Pending allocation",
  );
  const household = records.households.find(
    (h) => h.id === (registration?.household || participant.household),
  );
  const title =
    section === "overview"
      ? `Assalamu Alaikum, ${participant.name.split(" ")[0]}.`
      : participantSections.find((s) => s.slug === section)?.label || "My participation";
  return (
    <>
      <PageTitle
        eyebrow="Participant · Aḍḥiyah 2027"
        title={title}
        description={`${reference} · Your participation, from registration to collection.`}
      />
      {section === "overview" && (
        <>
          <Metrics
            items={[
              { label: "Registration", value: status },
              { label: "Your shares", value: shares },
              { label: "Verified payments", value: money(verified) },
              { label: "Outstanding", value: money(Math.max(0, contribution - verified)) },
            ]}
          />
          <div className="grid gap-10 lg:grid-cols-2">
            <section>
              <h2 className="mb-6 text-xl font-bold">Your programme journey</h2>
              <Timeline
                steps={[
                  "Registration submitted",
                  "Committee approval",
                  "Payment verified",
                  "Group assignment",
                  "Preparation & packaging",
                  "Collection confirmed",
                ]}
                active={
                  packageRow?.status === "Collected"
                    ? 5
                    : group
                      ? 3
                      : verified >= contribution
                        ? 2
                        : status === "Approved"
                          ? 1
                          : 0
                }
              />
              <Link
                to="/dashboard/$section"
                params={{ section: "registration" }}
                className={btn({ variant: "outline", className: "mt-6" })}
              >
                View registration
                <ArrowRight className="size-4" />
              </Link>
            </section>
            <section>
              <h2 className="mb-5 text-xl font-bold">What happens next?</h2>
              <div className="border-l-2 border-cobalt pl-5">
                <p className="font-semibold">
                  {status === "Approved"
                    ? "Your participation is approved."
                    : "Your application is with the committee."}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {status === "Approved"
                    ? "Follow your payments and group allocation. Collection information appears after confirmation."
                    : "The committee will review your household, participant details and share request. Approval is required before allocation."}
                </p>
              </div>
              <h2 className="mb-4 mt-8 text-xl font-bold">Latest updates</h2>
              {records.announcements
                .filter(
                  (a) =>
                    a.status === "Published" && ["All users", "Participants"].includes(a.audience),
                )
                .slice(0, 2)
                .map((a) => (
                  <article key={a.id} className="border-b border-border py-4">
                    <p className="text-xs text-cobalt">{a.date}</p>
                    <h3 className="mt-2 font-semibold">{a.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{a.message}</p>
                  </article>
                ))}
            </section>
          </div>
        </>
      )}
      {section === "registration" && (
        <>
          <div className="mb-6">
            <Status>{status}</Status>
          </div>
          <dl className="max-w-2xl divide-y divide-border">
            {[
              ["Reference", reference],
              ["Participant", participant.name],
              ["Contact", participant.email],
              [
                "Household",
                registration?.household || participant.household || "Pending verification",
              ],
              ["Participation", `${shares} cattle shares`],
              ["Contribution", money(contribution)],
              ["Committee review", registration?.review || "Awaiting review"],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_1fr] gap-4 py-4 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="break-words font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {section === "household" && (
        <>
          <h2 className="text-xl font-bold">
            {household?.name || "Household verification pending"}
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            {household?.address || "Submitted household information is awaiting review."}
          </p>
          <p className="mt-3 text-sm">
            {household?.id || participant.household} · {household?.members || "—"} members
          </p>
          <p className="mt-6 text-xs text-muted-foreground">
            Other family members are not automatically registered through this household record.
          </p>
        </>
      )}
      {section === "participation" && (
        <>
          <Metrics
            items={[
              { label: "Participation option", value: "Cattle share" },
              { label: "Selected shares", value: shares },
              { label: "Price per share", value: money(sample.price) },
              { label: "Total contribution", value: money(contribution) },
            ]}
          />
          <Status>{status}</Status>
          <p className="mt-5 text-sm text-muted-foreground">
            Participation selections are reviewed by the committee before group allocation.
          </p>
        </>
      )}
      {section === "payments" && (
        <>
          <Metrics
            items={[
              { label: "Contribution", value: money(contribution) },
              { label: "Verified payments", value: money(verified) },
              { label: "Outstanding", value: money(Math.max(0, contribution - verified)) },
              {
                label: "Pending submissions",
                value: records.payments.filter(
                  (p) => p.participant === reference && p.status === "Pending verification",
                ).length,
              },
            ]}
          />
          <Button
            className="mb-5"
            disabled={status !== "Approved"}
            onClick={() => setPayment(true)}
          >
            <Plus className="size-4" />
            Submit payment record
          </Button>
          {status !== "Approved" && (
            <p className="mb-5 text-xs text-muted-foreground">
              Payment submission becomes available after committee approval.
            </p>
          )}
          <DataTable
            rows={records.payments.filter((p) => p.participant === reference)}
            columns={[
              { key: "id", label: "Reference" },
              { key: "amount", label: "Amount" },
              { key: "method", label: "Method" },
              { key: "status", label: "Verification" },
            ]}
            actions={(r) =>
              r.status === "Verified" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast.info(`Sample receipt ${r.id} · ${money(r.amount)} · Verified`);
                    window.print();
                  }}
                >
                  <Printer className="size-4" />
                  Receipt
                </Button>
              )
            }
          />
          <p className="mt-5 text-xs text-muted-foreground">
            A submitted payment is not yet verified. Your official balance updates after committee
            verification.
          </p>
        </>
      )}
      {section === "allocation" && (
        <>
          <h2 className="text-xl font-bold">
            {group ? `Group ${group.id}` : "Assignment awaiting confirmation"}
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            {group
              ? `Animal ${group.animal} · ${shares} shares · Committee-confirmed assignment`
              : "Approved registrations become eligible for group allocation. Your group appears once the committee confirms and publishes it."}
          </p>
          <div className="mt-5">
            <Status>{group ? "Assigned" : "Pending allocation"}</Status>
          </div>
        </>
      )}
      {section === "collection" && (
        <>
          <h2 className="text-xl font-bold">
            {packageRow ? packageRow.location : "Collection schedule awaiting confirmation"}
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            {packageRow
              ? `${packageRow.quantity} kg · ${packageRow.time} · Sample schedule, date to be confirmed`
              : "Your personal quantity and collection window appear only after committee confirmation."}
          </p>
          {packageRow && (
            <div className="mt-5">
              <Status>{packageRow.status}</Status>
            </div>
          )}
          <p className="mt-6 text-sm text-muted-foreground">
            Keep your registration reference available. An assigned volunteer records collection
            after handover.
          </p>
        </>
      )}
      {section === "updates" &&
        records.announcements
          .filter(
            (a) => a.status === "Published" && ["All users", "Participants"].includes(a.audience),
          )
          .map((a) => (
            <article key={a.id} className="border-b border-border py-5">
              <p className="text-xs text-cobalt">{a.date}</p>
              <h2 className="mt-3 text-xl font-bold">{a.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{a.message}</p>
            </article>
          ))}
      {section === "profile" && (
        <div className="grid gap-10 md:grid-cols-2">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              enter({
                ...participant,
                name: String(d.get("name")),
                email: String(d.get("contact")),
              });
              toast.success("Demo participant profile updated");
            }}
          >
            <Field label="Full name" name="name" defaultValue={participant.name} required />
            <Field label="Contact" name="contact" defaultValue={participant.email} required />
            <Button>Save profile</Button>
          </form>
          <section>
            <h2 className="text-xl font-bold">Need a little help?</h2>
            <p className="mt-4 text-sm text-muted-foreground">
              committee@example.com · Sample contact
            </p>
            <Link to="/contact" className={btn({ variant: "outline", className: "mt-5" })}>
              Contact committee
            </Link>
          </section>
        </div>
      )}
      <Modal open={payment} onClose={() => setPayment(false)} title="Submit a payment record">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            add("payments", {
              id: `PAY-${records.payments.length + 1}`,
              participant: reference,
              name: participant.name,
              amount: String(d.get("amount")),
              method: String(d.get("method")),
              date: String(d.get("date")),
              status: "Pending verification",
            });
            toast.success("Sample payment submitted for committee verification");
            setPayment(false);
          }}
        >
          <Field label="Amount" name="amount" type="number" min={1} required />
          <SelectField label="Payment method" name="method" options={["Bank transfer", "Cash"]} />
          <Field label="Transaction date" name="date" type="date" required />
          <Field label="Transaction reference" required />
          <label className="block text-sm">
            Supporting document
            <input type="file" className="mt-2 block text-xs" />
          </label>
          <Button>Submit for verification</Button>
          <p className="text-xs text-muted-foreground">No actual money is transferred.</p>
        </form>
      </Modal>
    </>
  );
}
