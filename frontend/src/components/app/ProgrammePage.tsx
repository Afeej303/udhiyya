import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, MapPin, Mail, Phone, HandHeart } from "lucide-react";
import { PublicShell } from "./PublicShell";
import { btn, Button } from "./Btn";
import { PageTitle, Metrics, Timeline, Status, Modal } from "./WorkflowUI";
import { Field } from "./AuthShell";
import { useDemo } from "./DemoStore";
import { money, sample } from "@/lib/workflow";
import { useState } from "react";
import { toast } from "sonner";
export type PublicSection =
  | "programme"
  | "about"
  | "process"
  | "rules"
  | "guidelines"
  | "faq"
  | "contact"
  | "announcements"
  | "distribution";
export function ProgrammePage({ section }: { section: PublicSection }) {
  const { records, programmeStatus } = useDemo();
  const [enquiry, setEnquiry] = useState(false);
  const titles: Record<PublicSection, string> = {
    programme: "Our progress. Open to everyone.",
    about: "Faith in action. Care in common.",
    process: "From your share to a shared blessing.",
    rules: "Guidelines & pricing",
    guidelines: "Guidelines & pricing",
    faq: "Your questions, answered.",
    contact: "Your committee is here.",
    announcements: "The latest from our committee.",
    distribution: "A blessing for every household.",
  };
  const publicNotices = records.announcements.filter(
    (a) => a.status === "Published" && a.audience === "All users",
  );
  const collected = records.payments
    .filter((p) => p.status === "Verified")
    .reduce((n, p) => n + Number(p.amount), 0);
  const expenses = records.expenses.reduce((n, p) => n + Number(p.amount), 0);
  return (
    <PublicShell>
      <main className="mx-auto max-w-6xl px-5 py-12">
        <PageTitle
          eyebrow={`QurbaniOS / ${section}`}
          title={titles[section]}
          description={`${sample.locality} · Aḍḥiyah ${sample.year} · Illustrative programme information`}
        />
        <nav className="mb-10 flex flex-wrap gap-2 border-b border-border pb-5">
          {[
            { to: "/about", label: "About" },
            { to: "/process", label: "How it works" },
            { to: "/guidelines", label: "Guidelines" },
            { to: "/programme", label: "Progress" },
            { to: "/distribution", label: "Distribution" },
          ].map((l) => (
            <Link key={l.to} to={l.to} className={btn({ variant: "ghost", size: "sm" })}>
              {l.label}
            </Link>
          ))}
        </nav>
        {section === "about" && (
          <>
            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <HandHeart className="size-9 text-cobalt" />
                <h2 className="mt-5 text-2xl font-bold">
                  One Mahallu. A collective responsibility.
                </h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  Our annual Aḍḥiyah programme brings households together to participate, prepare
                  and distribute with care. The committee oversees every stage, with dedicated teams
                  for slaughter, processing, distribution and finance.
                </p>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  Participant allocations and eligible public beneficiary allocations follow
                  separate committee-configured policies. Public updates share collective progress,
                  never personal household information.
                </p>
              </div>
              <Timeline
                steps={[
                  "Programme planning & household records",
                  "Registration & committee approval",
                  "Animal procurement & group allocation",
                  "Preparation, weighing & packaging",
                  "Participant and public distribution",
                  "Final reports & programme closure",
                ]}
                active={1}
              />
            </div>
            <Link to="/signup" className={btn({ className: "mt-10" })}>
              Start participation
              <ArrowUpRight className="size-4" />
            </Link>
          </>
        )}
        {section === "process" && (
          <Timeline
            steps={[
              "Verify your mobile number or email",
              "Find your household or submit it for verification",
              "Enter participant information",
              "Select participation and shares",
              "Review, accept guidelines and submit",
              "Receive your registration reference",
              "Committee reviews your application",
              "After approval, follow payments, allocation and collection",
            ]}
            active={0}
          />
        )}
        {(section === "rules" || section === "guidelines") && (
          <>
            <div className="mb-10 grid gap-6 md:grid-cols-3">
              <div className="border-l-2 border-cobalt pl-5">
                <p className="text-sm text-muted-foreground">Share contribution</p>
                <p className="mt-2 text-4xl font-bold">{money(sample.price)}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Per cattle share · illustrative price
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registration period</p>
                <p className="mt-3 font-semibold">
                  {sample.opening} — {sample.deadline}
                </p>
                <div className="mt-3">
                  <Status>{programmeStatus}</Status>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eid & programme date</p>
                <p className="mt-3 font-semibold">Awaiting committee confirmation</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  No confirmed Eid date is assumed.
                </p>
              </div>
            </div>
            <h2 className="mb-5 text-xl font-bold">Participation guidelines</h2>
            <ul className="space-y-5">
              {[
                "Household records and participation registration are separate. Importing a household never registers its members.",
                "All new registrations are subject to committee review and approval.",
                "Select your intended shares and review the contribution before submission.",
                "Animal group capacity is configured by the committee. Only approved participants may be allocated.",
                "A submitted cash collection is not a verified payment. Official receipts follow finance committee verification.",
                "Personal collection information is shown only after allocation and schedule confirmation.",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-sm leading-relaxed">
                  <Check className="mt-1 size-4 shrink-0 text-cobalt" />
                  {t}
                </li>
              ))}
            </ul>
            <Link to="/signup" className={btn({ className: "mt-8" })}>
              Register participation
              <ArrowUpRight className="size-4" />
            </Link>
          </>
        )}
        {section === "announcements" && (
          <div className="divide-y divide-border">
            {publicNotices.map((a) => (
              <article key={a.id} className="py-6">
                <p className="text-xs text-cobalt">Public notice · {a.date}</p>
                <h2 className="mt-3 text-2xl font-bold">{a.title}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {a.message}
                </p>
              </article>
            ))}
          </div>
        )}
        {section === "programme" && (
          <>
            <Metrics
              items={[
                { label: "Registered participants", value: records.participants.length },
                {
                  label: "Approved participants",
                  value: records.participants.filter((p) => p.status === "Approved").length,
                },
                { label: "Procured animals", value: records.animals.length },
                { label: "Active volunteers", value: records.volunteers.length },
              ]}
            />
            <div className="grid gap-10 md:grid-cols-2">
              <section>
                <h2 className="mb-6 text-xl font-bold">Programme milestones</h2>
                <Timeline
                  steps={[
                    "Programme published",
                    "Registration open",
                    "Review & allocation",
                    "Operational preparation",
                    "Distribution",
                    "Programme closed",
                  ]}
                  active={1}
                />
              </section>
              <section>
                <h2 className="mb-5 text-xl font-bold">Public financial summary</h2>
                <dl className="divide-y divide-border">
                  {[
                    [
                      "Expected contributions",
                      money(records.participants.reduce((n, p) => n + Number(p.amount), 0)),
                    ],
                    ["Verified collections", money(collected)],
                    ["Recorded expenses", money(expenses)],
                    ["Available balance", money(collected - expenses)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 py-4 text-sm">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                  Illustrative totals only. No individual names, payment details or beneficiary
                  records are public.
                </p>
              </section>
            </div>
          </>
        )}
        {section === "faq" && (
          <div className="divide-y divide-border">
            {[
              [
                "Who can participate?",
                "Households can submit participation information for committee review according to the programme guidelines.",
              ],
              [
                "Does a household record mean I am registered?",
                "No. A household record is a separate community record. Each participation application must be submitted and approved.",
              ],
              [
                "How much is one share?",
                "The sample design uses ₹8,500 per cattle share. Actual pricing must be confirmed by the committee.",
              ],
              [
                "Is the Eid date confirmed?",
                "No. The countdown remains empty until the committee confirms a date.",
              ],
              [
                "Can I enquire about public distribution without participating?",
                "Yes. Public distribution is separate from paid participation, and eligibility is reviewed by the committee.",
              ],
              [
                "Is this a live service?",
                "No. All accounts, verification, financial records and operational updates are frontend demonstrations only.",
              ],
            ].map(([q, a]) => (
              <details key={q} className="py-5">
                <summary className="cursor-pointer text-lg font-semibold">{q}</summary>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        )}
        {section === "contact" && (
          <>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                ["Amina Rahman", "Programme coordinator"],
                ["Yusuf Ahmed", "Participant support"],
                ["Nabeel Hassan", "Finance support"],
              ].map(([name, role]) => (
                <article key={name} className="rounded-lg border border-border bg-card p-6">
                  <div className="grid size-11 place-items-center rounded-full bg-accent font-semibold text-cobalt">
                    {(name || "")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <h2 className="mt-5 text-lg font-bold">{name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{role}</p>
                </article>
              ))}
            </div>
            <div className="mt-10 grid gap-10 md:grid-cols-2">
              <div className="space-y-5 text-sm">
                <p className="flex items-center gap-3">
                  <MapPin className="size-4 text-cobalt" />
                  {sample.locality}
                </p>
                <p className="flex items-center gap-3">
                  <Mail className="size-4 text-cobalt" />
                  committee@example.com
                </p>
                <p className="text-xs text-muted-foreground">
                  Fictional committee members and sample contact, not monitored.
                </p>
              </div>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success("Sample enquiry recorded. No message was sent.");
                  e.currentTarget.reset();
                }}
              >
                <Field label="Your name" required />
                <Field label="Email or mobile" required />
                <label className="block text-sm">
                  Message
                  <textarea
                    required
                    className="mt-2 min-h-24 w-full rounded-lg border border-border bg-card p-3"
                  />
                </label>
                <Button type="submit">Submit enquiry — demo</Button>
              </form>
            </div>
          </>
        )}
        {section === "distribution" && (
          <>
            <Metrics
              items={[
                { label: "Distribution status", value: "Preparation" },
                { label: "Collection locations", value: "1", note: "Sample community hall" },
                { label: "Collection date", value: "To be confirmed" },
                { label: "Collection progress", value: "0%" },
              ]}
            />
            <div className="grid gap-10 md:grid-cols-2">
              <section>
                <h2 className="text-xl font-bold">Public distribution, with dignity.</h2>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Eligible households can receive public distribution according to
                  committee-configured criteria. Financial participation is not required to explore
                  eligibility or enquire. No enquiry guarantees approval.
                </p>
                <h3 className="mt-6 font-semibold">Collection arrangements</h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  Community hall · Demo Mahallu, Kerala. Dates, quantities and collection references
                  appear only once confirmed.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/login" className={btn({})}>
                    Beneficiary access
                    <ArrowUpRight className="size-4" />
                  </Link>
                  <Button variant="outline" onClick={() => setEnquiry(true)}>
                    Enquire about distribution
                  </Button>
                </div>
              </section>
              <Timeline
                steps={[
                  "Committee records eligible household",
                  "Identity and eligibility verified",
                  "Allocation confirmed",
                  "Collection schedule published",
                  "Package prepared",
                  "Collection confirmed after handover",
                ]}
                active={1}
              />
            </div>
            <Modal
              open={enquiry}
              onClose={() => setEnquiry(false)}
              title="Public distribution enquiry"
            >
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success(
                    "Sample enquiry submitted for review. Eligibility is not guaranteed.",
                  );
                  setEnquiry(false);
                }}
              >
                <Field label="Household head" required />
                <Field label="Mobile or email" required />
                <Field label="Household address" required />
                <p className="text-xs text-muted-foreground">
                  Frontend demonstration. No enquiry is sent to a real committee.
                </p>
                <Button type="submit">Submit enquiry</Button>
              </form>
            </Modal>
          </>
        )}
      </main>
    </PublicShell>
  );
}
