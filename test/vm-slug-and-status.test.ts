import { describe, expect, it } from "vitest";
import { generateUniqueVmSlug, isValidVmSlug } from "@/lib/vm-slug";
import { allowedVmActions, getVmUrl, isStableVmStatus, isTransitionalVmStatus } from "@/lib/vm-status";

describe("VM slug and status helpers", () => {
  it("validates readable slugs", () => {
    expect(isValidVmSlug("terry-bobby-black")).toBe(true);
    expect(isValidVmSlug("Terry-Bobby-Black")).toBe(false);
    expect(isValidVmSlug("two-words")).toBe(false);
  });

  it("adds a suffix after repeated slug collisions", async () => {
    const slug = await generateUniqueVmSlug(async (candidate) => candidate.split("-").length === 4);
    expect(isValidVmSlug(slug)).toBe(true);
    expect(slug.split("-")).toHaveLength(4);
  });

  it("defines consistent action visibility and URLs", () => {
    expect(allowedVmActions("running")).toEqual({ open: true, start: false, stop: true, terminate: true });
    expect(allowedVmActions("terminated").terminate).toBe(false);
    expect(isTransitionalVmStatus("starting")).toBe(true);
    expect(isStableVmStatus("stopped")).toBe(true);
    expect(getVmUrl("milo-river-stone")).toBe("https://milo-river-stone.vm.nvos.in");
  });
});
