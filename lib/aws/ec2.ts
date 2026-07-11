import "server-only";

import { EC2Client } from "@aws-sdk/client-ec2";

const requiredEnvironmentVariables = [
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
] as const;

function getAwsConfiguration() {
  const missingVariables = requiredEnvironmentVariables.filter(
    (variable) => !process.env[variable]?.trim(),
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required AWS environment variables: ${missingVariables.join(", ")}.`,
    );
  }

  return {
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  };
}

let ec2Client: EC2Client | undefined;

export function getEc2Client() {
  ec2Client ??= new EC2Client(getAwsConfiguration());

  return ec2Client;
}
