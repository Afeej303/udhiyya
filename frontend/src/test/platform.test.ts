import { describe, expect, it } from "vitest";
import { isPlatformOwner, organisationSummary, platformRecords } from "@/lib/platform";
describe("Platform owner scope", () => {
  it("allows the Super Admin role into platform management", () =>
    expect(isPlatformOwner({ role: "Super Admin", name: "Owner" })).toBe(true));
  it("does not treat Committee Admins as platform owners", () =>
    expect(isPlatformOwner({ role: "Committee", name: "Committee" })).toBe(false));
  it("counts organisation access and onboarding independently", () =>
    expect(organisationSummary(platformRecords.platformOrganisations)).toEqual({
      total: 4,
      active: 2,
      inactive: 1,
      onboarding: 1,
    }));
});
