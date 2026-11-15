import { describe, expect, it } from "vitest";
import {
  allocationError,
  canAllocateQuantity,
  verifiedBalance,
  demoAccounts,
  initialRecords,
  type RowInput,
} from "@/lib/workflow";
const participant: RowInput = { id: "P-1", status: "Approved", shares: "2" };
const group: RowInput = {
  id: "G-1",
  status: "Draft",
  capacity: "7",
  occupied: "6",
  participants: "",
};
describe("Frontend programme workflow rules", () => {
  it("rejects allocation beyond the configured share capacity", () =>
    expect(allocationError(participant, group, [group])).toBe(
      "The selected group does not have enough available shares.",
    ));
  it("blocks duplicate participant allocation", () =>
    expect(
      allocationError(participant, { ...group, occupied: "0" }, [
        { ...group, participants: "P-1" },
      ]),
    ).toBe("This participant is already allocated."));
  it("only allocates approved registrations", () =>
    expect(
      allocationError({ ...participant, status: "Pending review" }, { ...group, occupied: "0" }, [
        group,
      ]),
    ).toBe("Only approved participants can be allocated."));
  it("permits allocation when configured shares are available", () =>
    expect(allocationError(participant, { ...group, occupied: "5" }, [group])).toBeNull());
  it("prevents quantity allocations exceeding recorded available weight", () =>
    expect(canAllocateQuantity(100, 90, 11)).toBe(false));
  it("permits allocation at exact recorded quantity", () =>
    expect(canAllocateQuantity(100, 90, 10)).toBe(true));
  it("does not count submitted cash as verified participant payment", () =>
    expect(verifiedBalance(initialRecords.payments, "QOS-2027-001")).toBe(0));
  it("updates balance only after committee verification", () =>
    expect(
      verifiedBalance(
        initialRecords.payments.map((p) => (p.id === "PAY-001" ? { ...p, status: "Verified" } : p)),
        "QOS-2027-001",
      ),
    ).toBe(8500));
  it("uses the volunteer department assigned by the committee account", () =>
    expect(demoAccounts.find((a) => a.name === "Yusuf Ahmed")?.department).toBe("Processing"));
});
