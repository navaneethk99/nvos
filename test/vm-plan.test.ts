import { describe, expect, it } from "vitest";

import { INSTANCE_TYPES, isVmPlan } from "@/lib/vm-plan";

describe("VM plans", () => {
  it.each([
    ["micro", "t3.micro"],
    ["small", "t3.small"],
    ["medium", "t3.medium"],
    ["large", "t3.large"],
  ] as const)("maps %s to %s", (plan, instanceType) => {
    expect(isVmPlan(plan)).toBe(true);
    expect(INSTANCE_TYPES[plan]).toBe(instanceType);
  });

  it("rejects arbitrary AWS instance types", () => {
    expect(isVmPlan("c7i.large")).toBe(false);
    expect(isVmPlan(undefined)).toBe(false);
  });
});
