import { describe, expect, it } from "vitest";

import {
  compatiblePlanForOperatingSystem,
  desktopActionForOperatingSystem,
  defaultVmOperatingSystem,
  isPlanAvailableForOperatingSystem,
  vmCreateRequest,
} from "@/app/dashboard/vm-manager";

describe("VM launch form", () => {
  it("defaults to Ubuntu", () => {
    expect(defaultVmOperatingSystem).toBe("ubuntu");
  });

  it("includes the selected Windows operating system in the launch request", () => {
    expect(vmCreateRequest("Windows workspace", "", "medium", "windows")).toMatchObject({
      os: "windows",
      plan: "medium",
    });
  });

  it("does not make micro or small available for Windows", () => {
    expect(isPlanAvailableForOperatingSystem("windows", "micro")).toBe(false);
    expect(isPlanAvailableForOperatingSystem("windows", "small")).toBe(false);
    expect(isPlanAvailableForOperatingSystem("windows", "medium")).toBe(true);
    expect(isPlanAvailableForOperatingSystem("windows", "large")).toBe(true);
  });

  it("selects medium when switching to Windows from an unsupported plan", () => {
    expect(compatiblePlanForOperatingSystem("windows", "micro")).toBe("medium");
    expect(compatiblePlanForOperatingSystem("windows", "small")).toBe("medium");
  });

  it("keeps all Ubuntu plans available", () => {
    expect(isPlanAvailableForOperatingSystem("ubuntu", "micro")).toBe(true);
    expect(compatiblePlanForOperatingSystem("ubuntu", "micro")).toBe("micro");
  });

  it("keeps the Ubuntu desktop action as the VM URL", () => {
    expect(desktopActionForOperatingSystem("ubuntu", "https://archie.vm.nvos.in")).toEqual({
      kind: "open",
      url: "https://archie.vm.nvos.in",
    });
  });

  it("replaces the Windows desktop action with the pending integration status", () => {
    expect(desktopActionForOperatingSystem("windows", "https://archie.vm.nvos.in")).toEqual({
      kind: "pending",
      label: "Windows desktop integration pending",
    });
  });
});
