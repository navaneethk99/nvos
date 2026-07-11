# nvos

nvos is a cloud-computing platform that gives people a virtual computer in their browser. Choose the compute power and operating system you need, launch an instance, and pay only for the time it runs.

The product is designed to be approachable for students and powerful enough for engineers, gamers, video editors, and designers.

## Current Experience

- A responsive, Tailwind CSS landing page introducing the nvos platform.
- Clear compute, operating-system, and pay-as-you-go messaging.
- Use-case content for students, creators, and technical builders.
- An animated marquee with reduced-motion support.
- A Google OAuth sign-in page linked from every launch CTA.

## Tech Stack

- Next.js 16 with the App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Better Auth with Google OAuth
- Neon Postgres with Drizzle ORM

## Run Locally

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Authentication Setup

Copy `.env.example` to `.env.local`, then set your Neon `DATABASE_URL`, a Better Auth secret, and a Google OAuth web client ID and secret. In Google Cloud, authorize `http://localhost:3000/api/auth/callback/google` as a redirect URI.

Create and apply the Better Auth tables before signing in:

```bash
npm run db:generate
npm run db:migrate
```

## VM Management

The dashboard creates one browser-accessible Ubuntu VM per user through an internal proxy control service; it never calls AWS from browser code. Apply the `0002_vm_management` Drizzle migration, then configure:

```bash
NVOS_CONTROL_URL=https://proxy-control.internal
NVOS_CONTROL_SECRET=replace-with-a-server-only-secret
NVOS_VM_BASE_DOMAIN=vm.nvos.in
```

The control service must expose `POST /internal/vms`, `POST /internal/vms/:id/start`, `POST /internal/vms/:id/stop`, and `POST /internal/vms/:id/terminate`, authenticated with `Authorization: Bearer <NVOS_CONTROL_SECRET>`. It should return the VM ID, slug, hostname, instance ID, private IP, and status described by the API implementation.

Configure wildcard DNS: `*.vm.nvos.in -> 13.200.44.11`. For local testing, point `NVOS_CONTROL_URL` at a mocked HTTP service and run `npm test`; tests do not contact AWS or the proxy. The MVP permits one non-terminated/non-failed VM per user. Random subdomains are not authorization: protect desktop access at the proxy with authenticated signed cookies, short-lived access tokens, or equivalent proxy-level authorization.

## Available Commands

```bash
npm run dev    # Start the development server
npm run lint   # Run ESLint
npm run build  # Create a production build
npm run start  # Serve the production build
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | nvos landing page |
| `/sign-in` | Google OAuth sign-in and account creation |
