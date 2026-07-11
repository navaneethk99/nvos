import { describe, expect, it } from "vitest";

import {
  Ec2LaunchConfigurationError,
  getEc2LaunchConfiguration,
} from "@/lib/aws/ec2-launch-config";

describe("getEc2LaunchConfiguration", () => {
  it("rejects missing required launch settings", () => {
    expect(() => getEc2LaunchConfiguration({})).toThrow(
      Ec2LaunchConfigurationError,
    );
  });

  it("returns infrastructure settings without choosing an instance type", () => {
    expect(
      getEc2LaunchConfiguration({
        AWS_EC2_AMI_ID: "ami-test",
        AWS_EC2_KEY_NAME: "test-key",
        AWS_EC2_SECURITY_GROUP_ID: "sg-test",
        AWS_EC2_SUBNET_ID: "subnet-test",
      }),
    ).toEqual({
      amiId: "ami-test",
      keyName: "test-key",
      securityGroupId: "sg-test",
      subnetId: "subnet-test",
    });
  });
});
