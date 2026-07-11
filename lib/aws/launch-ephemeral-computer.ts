import "server-only";

import { RunInstancesCommand, type _InstanceType } from "@aws-sdk/client-ec2";

import { getEc2Client } from "@/lib/aws/ec2";
import { getEc2LaunchConfiguration } from "@/lib/aws/ec2-launch-config";

export type LaunchedComputer = {
  instanceId: string;
  state: string;
  instanceType: string;
};

const ephemeralTags = [
  { Key: "Name", Value: "nvos-session" },
  { Key: "Project", Value: "nvos" },
  { Key: "ManagedBy", Value: "nvos-backend" },
  { Key: "Ephemeral", Value: "true" },
];

export async function launchEphemeralComputer(instanceType = "t3.micro"): Promise<LaunchedComputer> {
  const configuration = getEc2LaunchConfiguration();

  const userDataScript = `#!/bin/bash
  set -euxo pipefail

  exec > >(tee /var/log/nvos-bootstrap.log | logger -t nvos-bootstrap -s 2>/dev/console) 2>&1

  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io curl

  systemctl enable --now docker

  docker pull dorowu/ubuntu-desktop-lxde-vnc

  docker run -d \
    --name nvos-desktop \
    --restart unless-stopped \
    --shm-size=1g \
    -p 6080:80 \
    dorowu/ubuntu-desktop-lxde-vnc

  until curl --fail --silent http://127.0.0.1:6080/ >/dev/null; do
    sleep 3
  done

  touch /var/lib/nvos-desktop-ready
  `;

  const response = await getEc2Client().send(
    new RunInstancesCommand({
      ImageId: configuration.amiId,
      InstanceType: instanceType as _InstanceType,
      KeyName: configuration.keyName,
      MinCount: 1,
      MaxCount: 1,

      NetworkInterfaces: [
        {
          DeviceIndex: 0,
          AssociatePublicIpAddress: true,
          DeleteOnTermination: true,
          Groups: [configuration.securityGroupId],
          SubnetId: configuration.subnetId,
        },
      ],

      UserData: Buffer.from(userDataScript).toString("base64"),

      // Inherit the official Ubuntu AMI's root EBS mapping and delete-on-termination behavior.
      TagSpecifications: [
        { ResourceType: "instance", Tags: ephemeralTags },
        { ResourceType: "volume", Tags: ephemeralTags },
      ],
    }),
  );

  const launchedInstance = response.Instances?.[0];

  if (!launchedInstance?.InstanceId || !launchedInstance.State?.Name) {
    throw new Error("EC2 did not return the launched instance details.");
  }

  return {
    instanceId: launchedInstance.InstanceId,
    state: launchedInstance.State.Name,
    instanceType,
  };
}
