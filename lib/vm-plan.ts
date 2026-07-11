export const INSTANCE_TYPES = {
  micro: "t3.micro",
  small: "t3.small",
  medium: "t3.medium",
  large: "t3.large",
} as const;

export type VmPlan = keyof typeof INSTANCE_TYPES;

export function isVmPlan(value: unknown): value is VmPlan {
  return typeof value === "string" && value in INSTANCE_TYPES;
}
