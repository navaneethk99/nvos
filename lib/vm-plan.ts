export const INSTANCE_TYPES = {
  micro: "t3.micro",
  small: "t3.small",
  medium: "c7i-flex.large",
  large: "m7i-flex.large",
} as const;

export type VmPlan = keyof typeof INSTANCE_TYPES;

export function isVmPlan(value: unknown): value is VmPlan {
  return typeof value === "string" && value in INSTANCE_TYPES;
}
