import { loadEnvConfig } from "@next/env";

const confirmationFlag = "--confirm-live-aws-termination";
const instanceIdPattern = /^i-[0-9a-f]{8}(?:[0-9a-f]{9})?$/;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  console.error("WARNING: Termination is permanent and cannot be undone.");

  const argumentsWithoutNode = process.argv.slice(2);
  const instanceIds = argumentsWithoutNode.filter((argument) =>
    instanceIdPattern.test(argument),
  );

  if (
    argumentsWithoutNode.length !== 2 ||
    !argumentsWithoutNode.includes(confirmationFlag) ||
    instanceIds.length !== 1
  ) {
    fail(
      `Usage: pnpm aws:terminate -- <instance-id> ${confirmationFlag}`,
    );
  }

  const instanceId = instanceIds[0];

  loadEnvConfig(process.cwd(), true);

  const [{ TerminateInstancesCommand }, { getEc2Client }] = await Promise.all([
    import("@aws-sdk/client-ec2"),
    import("../lib/aws/ec2"),
  ]);

  try {
    await getEc2Client().send(
      new TerminateInstancesCommand({ InstanceIds: [instanceId] }),
    );
  } catch {
    fail("Unable to terminate the supplied instance.");
  }

  console.log(JSON.stringify({ instanceId, state: "shutting-down" }));
}

void main();
