# First Controlled EC2 Launch

This procedure is for the first manual launch only. The start endpoint creates a billable EC2 instance. Do not run the launch command until the configuration below has been reviewed.

## Configure AWS

1. In the AWS Console region selector, choose **Asia Pacific (Mumbai)** (`ap-south-1`). All resources below must be in this region. The key pair, security group, and subnet must also be compatible with the same VPC.
2. Open **EC2** and choose **Launch instance**. Under **Application and OS Images (Amazon Machine Image)**, select **Ubuntu Server 24.04 LTS x86_64**. Copy the displayed AMI ID into `AWS_EC2_AMI_ID`.
3. Under **Key pair (login)** in the launch wizard, select the existing key pair. Verify its exact name in **EC2 -> Key Pairs** and use that name for `AWS_EC2_KEY_NAME`; it is not necessarily the downloaded `.pem` filename.
4. Open **EC2 -> Security Groups**, select the intended group, and copy its **Security group ID** into `AWS_EC2_SECURITY_GROUP_ID`. Initially, allow inbound SSH on port `22` only from the developer's public IP. Do not open port `6080` until the desktop service has been configured.
5. Open **VPC -> Subnets**, select a subnet in the compatible VPC, and copy its **Subnet ID** into `AWS_EC2_SUBNET_ID`.
6. Copy `.env.example` to `.env.local` and fill in the AWS credentials and resource identifiers. Use an IAM access key with only the permissions needed to launch, describe, and terminate this controlled test instance (`ec2:RunInstances`, `ec2:DescribeInstances`, and `ec2:TerminateInstances`).

The launcher sets the root EBS volume to delete when the instance is terminated. Confirm this behavior in the launch settings before proceeding.

## Launch And Verify

Start the local application in one terminal:

```sh
pnpm dev
```

In a second terminal, after reviewing `.env.local`, run the single explicit launch request:

```sh
pnpm aws:test-launch -- --confirm-live-aws-launch
```

The command prints only the instance ID, state, and instance type. Verify the instance in the EC2 console, then immediately terminate the test instance with its returned ID:

```sh
pnpm aws:terminate -- i-0123456789abcdef0 --confirm-live-aws-termination
```

Termination is permanent. The terminate command accepts exactly one valid instance ID and never enumerates or acts on any other instance.

## Production Limitations

This endpoint is intentionally for a controlled developer test. Before production use, add authentication, authorization, quotas, billing controls, and rate limiting. Keep AWS credentials server-side and do not expose them in client code or logs.
