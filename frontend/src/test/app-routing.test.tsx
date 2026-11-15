import { describe, expect, it } from "vitest";
import { rootRouteId } from "@tanstack/react-router";
import { router } from "@/router";

describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const matches = router.matchRoutes("/");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches admin portal route", () => {
    const matches = router.matchRoutes("/admin/dashboard");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches volunteer portal route", () => {
    const matches = router.matchRoutes("/volunteer/home");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches participant portal route", () => {
    const matches = router.matchRoutes("/participant/overview");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
