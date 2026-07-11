# nvos Control Service

Fastify service running on the proxy host. It launches and controls EC2 VMs through a launch template, waits for noVNC, and adds/removes only the affected Caddy Admin API route.

## Configuration

Copy `.env.example` to an environment file and set every empty value. Bind the service to `127.0.0.1`; Caddy Admin must also remain bound to loopback.

Required IAM permissions for the proxy instance role:

- `ec2:RunInstances`
- `ec2:DescribeInstances`
- `ec2:StartInstances`
- `ec2:StopInstances`
- `ec2:TerminateInstances`
- `ec2:CreateTags`

The launch template must define the AMI, instance type, security groups, subnet/network settings, IAM instance profile, and storage. The service supplies no infrastructure settings other than metadata tags.

## Deploy

1. Install dependencies and build: `npm install && npm run build` in this directory.
2. Place a restricted environment file at `/etc/nvos-control.env`.
3. Update the absolute paths and `User` in `nvos-control.service`, then install it to `/etc/systemd/system/nvos-control.service`.
4. Run `sudo systemctl daemon-reload && sudo systemctl enable --now nvos-control`.
5. Keep `CADDY_ADMIN_URL` loopback-only and configure DNS `*.vm.nvos.in` to the proxy public address.

The dashboard cannot reach a service bound to `127.0.0.1` directly. Publish a separate HTTPS control hostname through Caddy (for example, `control.nvos.in`) that reverse-proxies only to `127.0.0.1:3001`, then set Vercel's `NVOS_CONTROL_URL` to that HTTPS URL. Do not expose port `3001` directly; the service's bearer authorization remains required on every request.

The service expects Caddy's HTTP server to be named `srv0` and appends reverse-proxy routes under that server. Caddy's reverse proxy supports WebSockets by default. Do not expose port 2019 publicly.
