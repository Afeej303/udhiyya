import { Link } from "@tanstack/react-router";
import { Package, MapPin, Bell, HandHeart } from "lucide-react";
import { useDemo } from "./DemoStore";
import { PageTitle, Metrics, Timeline, Status } from "./WorkflowUI";
import { btn } from "./Btn";
export function BeneficiaryWorkspace({ section }: { section: string }) {
  const { records } = useDemo();
  const household = records.households.find((h) => h.id === "QBH-00125");
  const allocation = records.distribution.find((d) => d.recipient === "QBH-00125");
  const confirmed = allocation && allocation.status !== "Pending allocation";
  const active =
    allocation?.status === "Collected" ? 5 : allocation?.status === "Ready" ? 4 : confirmed ? 2 : 1;
  return (
    <>
      <PageTitle
        eyebrow="Beneficiary · QBH-00125"
        title={
          (
            {
              dashboard: "Your household. Your distribution.",
              household: "Household details",
              allocation: "Your allocation",
              collection: "Collection schedule",
              tracking: "Distribution tracking",
              updates: "Updates & support",
            } as Record<string, string>
          )[section] || "My distribution"
        }
        description="Private sample household information · Separate from participant allocations"
      />
      {section === "dashboard" && (
        <>
          <Metrics
            items={[
              { label: "Household reference", value: "QBH-00125" },
              { label: "Eligibility", value: "Approved", note: "Sample committee verification" },
              { label: "Allocation", value: confirmed ? "Assigned" : "Awaiting confirmation" },
              {
                label: "Collection",
                value: allocation?.status === "Collected" ? "Collected" : "Pending",
              },
            ]}
          />
          <div className="grid gap-10 md:grid-cols-2">
            <section>
              <h2 className="mb-6 text-xl font-bold">Your distribution journey</h2>
              <Timeline
                steps={[
                  "Household registered",
                  "Eligibility verified",
                  "Allocation confirmed",
                  "Collection schedule published",
                  "Package prepared",
                  "Collection confirmed",
                ]}
                active={active}
              />
            </section>
            <section className="border-t border-border pt-5">
              <HandHeart className="size-7 text-cobalt" />
              <h2 className="mt-5 text-xl font-bold">A little care, close to home.</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Your quantity and collection details will appear only after the committee confirms
                your allocation. Keep your household reference available for collection.
              </p>
              <Link
                to="/beneficiary/$section"
                params={{ section: "collection" }}
                className={btn({ variant: "outline", className: "mt-5" })}
              >
                View collection details
                <MapPin className="size-4" />
              </Link>
            </section>
          </div>
        </>
      )}
      {section === "household" && (
        <dl className="max-w-2xl divide-y divide-border">
          {[
            ["Reference", household?.id],
            ["Household head", household?.name],
            ["Address", household?.address],
            ["Registered contact", household?.contact],
            ["Family members", household?.members],
            ["Eligibility", "Approved by committee · sample"],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[130px_1fr] gap-4 py-5 text-sm">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {section === "allocation" && (
        <>
          <Package className="size-9 text-cobalt" />
          <h2 className="mt-5 text-2xl font-bold">
            {confirmed ? `${allocation.quantity} kg allocated` : "Allocation awaiting confirmation"}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {confirmed
              ? `Package ${allocation.id} · Public beneficiary pathway. Your allocation follows the committee’s public distribution policy.`
              : "No personal quantity is shown until the committee confirms the allocation."}
          </p>
          <div className="mt-5">
            <Status>{confirmed ? "Assigned" : "Pending confirmation"}</Status>
          </div>
        </>
      )}
      {section === "collection" && (
        <>
          <MapPin className="size-9 text-cobalt" />
          <h2 className="mt-5 text-2xl font-bold">
            {confirmed ? allocation.location : "Schedule to be confirmed"}
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            {confirmed
              ? `Sample window: ${allocation.time} · Date awaiting committee confirmation.`
              : "The committee will publish your personal schedule when confirmed."}
          </p>
          {confirmed && <p className="mt-5 font-mono text-lg">Collection reference: QBH-00125</p>}
          <p className="mt-5 max-w-xl text-sm text-muted-foreground">
            Bring your registered reference. Collection is recorded by an assigned volunteer after
            the package is handed over.
          </p>
        </>
      )}
      {section === "tracking" && (
        <Timeline
          steps={[
            "Household registered",
            "Eligibility verified",
            "Allocation confirmed",
            "Collection schedule published",
            "Package prepared",
            "Collection confirmed",
          ]}
          active={active}
        />
      )}{" "}
      {section === "updates" && (
        <div className="grid gap-10 md:grid-cols-2">
          <section>
            <h2 className="mb-5 text-xl font-bold">Programme updates</h2>
            {records.announcements
              .filter((a) => a.status === "Published" && a.audience === "All users")
              .map((a) => (
                <article key={a.id} className="border-b border-border py-4">
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{a.message}</p>
                </article>
              ))}
          </section>
          <section>
            <h2 className="text-xl font-bold">Contact committee</h2>
            <p className="mt-4 text-sm text-muted-foreground">
              committee@example.com · Sample contact, not monitored
            </p>
            <Link to="/contact" className={btn({ variant: "outline", className: "mt-5" })}>
              Enquire with committee
            </Link>
          </section>
        </div>
      )}
    </>
  );
}
