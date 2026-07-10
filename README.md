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
