import "server-only";

export type Ec2LaunchConfiguration = {
  amiId: string;
  instanceType: string;
  keyName: string;
  securityGroupId: string;
  subnetId: string;
};

const requiredEnvironmentVariables = [
  "AWS_EC2_AMI_ID",
  "AWS_EC2_KEY_NAME",
  "AWS_EC2_SECURITY_GROUP_ID",
  "AWS_EC2_SUBNET_ID",
] as const;

export class Ec2LaunchConfigurationError extends Error {
  constructor(missingVariables: readonly string[]) {
    super(
      `Missing required EC2 launch environment variables: ${missingVariables.join(", ")}.`,
    );
    this.name = "Ec2LaunchConfigurationError";
  }
}

export function getEc2LaunchConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Ec2LaunchConfiguration {
  const missingVariables = requiredEnvironmentVariables.filter(
    (variable) => !environment[variable]?.trim(),
  );

  if (missingVariables.length > 0) {
    throw new Ec2LaunchConfigurationError(missingVariables);
  }

  const configuredInstanceType = environment.AWS_EC2_INSTANCE_TYPE;

  if (configuredInstanceType !== undefined && !configuredInstanceType.trim()) {
    throw new Ec2LaunchConfigurationError(["AWS_EC2_INSTANCE_TYPE"]);
  }

  return {
    amiId: environment.AWS_EC2_AMI_ID!.trim(),
    instanceType: configuredInstanceType?.trim() ?? "t3.micro",
    keyName: environment.AWS_EC2_KEY_NAME!.trim(),
    securityGroupId: environment.AWS_EC2_SECURITY_GROUP_ID!.trim(),
    subnetId: environment.AWS_EC2_SUBNET_ID!.trim(),
  };
}
