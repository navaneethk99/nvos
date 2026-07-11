const confirmationFlag = "--confirm-live-aws-launch";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

type LaunchResponse = {
  instanceId: string;
  state: string;
  instanceType: string;
};

function isLaunchResponse(value: unknown): value is LaunchResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const response = value as Record<string, unknown>;

  return (
    typeof response.instanceId === "string" &&
    typeof response.state === "string" &&
    typeof response.instanceType === "string"
  );
}

async function main() {
  console.error("WARNING: This command creates a billable EC2 instance.");

  if (process.argv.length !== 3 || process.argv[2] !== confirmationFlag) {
    fail(`Refusing to launch. Re-run with ${confirmationFlag}.`);
  }

  let response: Response;

  try {
    response = await fetch("http://localhost:3000/api/computers/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preset: "basic" }),
    });
  } catch {
    fail("Launch request failed. Confirm the local server is running on port 3000.");
  }

  if (!response.ok) {
    fail(`Launch request failed with HTTP ${response.status}.`);
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    fail("Launch request returned an invalid JSON response.");
  }

  if (!isLaunchResponse(body)) {
    fail("Launch request returned an invalid response.");
  }

  console.log(
    JSON.stringify({
      instanceId: body.instanceId,
      state: body.state,
      instanceType: body.instanceType,
    }),
  );
}

void main();
