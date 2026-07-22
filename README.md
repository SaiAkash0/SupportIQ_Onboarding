# Support IQ Onboarding

A production-minded React and Next.js onboarding app with a configurable
three-step wizard, an admin configuration screen, and a database-backed testing
table.

The app stores user onboarding data in PostgreSQL through backend API routes.
It does not use browser localStorage for persistence.

## Features

- Three-page user onboarding wizard at `/`
- Email and password collection on step 1
- Password hashing before credentials are stored
- Admin page at `/admin` for assigning and ordering onboarding components
- Configurable components for About Me, Address, and Birthdate
- Validation that pages 2 and 3 always have at least one component
- Testing table at `/data` showing records saved in the database
- Resume support after credentials are submitted
- Session clears after completion so a refresh starts a new onboarding flow

## Tech Stack

- Next.js App Router
- React client components
- TypeScript
- Neon Postgres
- `postgres` SQL client
- Tailwind CSS
- Lucide React icons
- Node test runner
- ESLint

## Architecture

The frontend pages call Next.js API routes. Those API routes contain the backend
logic and talk to PostgreSQL through `db/index.ts`.

```mermaid
flowchart LR
  Browser["Browser UI"]
  Onboarding["/ Onboarding Wizard"]
  Admin["/admin Admin UI"]
  Data["/data Testing Table"]
  API["Next.js API Routes"]
  DBLayer["db/index.ts"]
  Postgres["PostgreSQL Database"]

  Browser --> Onboarding
  Browser --> Admin
  Browser --> Data
  Onboarding --> API
  Admin --> API
  Data --> API
  API --> DBLayer
  DBLayer --> Postgres
```

## Onboarding Flow

```mermaid
flowchart TD
  Start["Open /"]
  Step1["Step 1: Email + Password"]
  SaveAccount["Create or load user record"]
  Step2["Step 2: Admin-selected components"]
  SaveStep2["Persist page 2 data"]
  Step3["Step 3: Admin-selected components"]
  Complete["Persist final data and mark complete"]
  ThankYou["Show Thank You"]
  NewVisit["Refresh after completion"]

  Start --> Step1
  Step1 --> SaveAccount
  SaveAccount --> Step2
  Step2 --> SaveStep2
  SaveStep2 --> Step3
  Step3 --> Complete
  Complete --> ThankYou
  ThankYou --> NewVisit
  NewVisit --> Step1
```

## Admin Configuration Flow

```mermaid
flowchart TD
  AdminPage["Open /admin"]
  LoadConfig["Load onboarding_config"]
  Assign["Assign each component to page 2 or page 3"]
  Order["Move components up or down within a page"]
  Validate["Ensure both pages have at least one component"]
  Save["Save configuration"]
  Wizard["Wizard renders updated page layout"]

  AdminPage --> LoadConfig
  LoadConfig --> Assign
  Assign --> Order
  Order --> Validate
  Validate --> Save
  Save --> Wizard
```

## Folder Structure

```text
Support_IQ/
  app/
    api/
      config/
        route.ts                  # Read and update admin component config
      onboarding/
        account/
          route.ts                # Create or resume account record
        profile/
          route.ts                # Save page 2 and page 3 onboarding data
        session/
          route.ts                # Read or clear current onboarding session
      users/
        route.ts                  # Data table API
    admin/
      admin-client.tsx            # Admin UI client component
      page.tsx                    # Admin route
    data/
      data-client.tsx             # Testing table client component
      page.tsx                    # Data table route
    globals.css                   # Shared styling
    layout.tsx                    # App metadata and root layout
    onboarding-client.tsx         # Main onboarding wizard UI
    page.tsx                      # Main route
  db/
    index.ts                      # Database access, validation, serialization
    schema.sql                    # PostgreSQL schema reference
  public/
    favicon.svg
    og.png
  tests/
    rendered-html.test.mjs        # Route and source integrity tests
  .env.example                    # Required environment variables
  package.json                    # Scripts and dependencies
  next.config.ts                  # Next.js config
  tsconfig.json                   # TypeScript config
```

## Database

This app uses Neon Postgres. Neon is a serverless PostgreSQL provider, so the
application still connects with a normal PostgreSQL connection string through
`DATABASE_URL`.

Required environment variable:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DATABASE?sslmode=require&channel_binding=require"
```

Optional environment variable:

```bash
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

The API creates the required tables automatically on first use. The schema is
also documented in `db/schema.sql`.

### Getting the Neon URL

1. Create a Neon project.
2. Open the project in the Neon Console.
3. Click **Connect**.
4. Select the database and role you want the app to use.
5. Copy the pooled connection string.
6. Paste it into `.env.local` as `DATABASE_URL`.

Use the pooled connection string for the deployed app. It usually contains
`-pooler` in the hostname.

Main tables:

- `users`: stores credentials, onboarding fields, progress, and completion
- `onboarding_config`: stores which components appear on page 2 or page 3 and
  their display order

## API Routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/config` | `GET` | Read admin component configuration |
| `/api/config` | `PUT` | Save component page placement and order |
| `/api/onboarding/account` | `POST` | Create or resume a user record |
| `/api/onboarding/profile` | `PATCH` | Save page 2 or page 3 data |
| `/api/onboarding/session` | `GET` | Read current onboarding session |
| `/api/onboarding/session` | `DELETE` | Clear current onboarding session |
| `/api/users` | `GET` | Read saved user records for `/data` |

## How To Run

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Update `.env.local` with your Neon connection string:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DATABASE?sslmode=require&channel_binding=require"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

Start the development server:

```bash
npm run dev
```

Open the app:

```text
http://localhost:3000
```

Useful routes:

```text
http://localhost:3000
http://localhost:3000/admin
http://localhost:3000/data
```

## Commands

```bash
npm run dev      # Start local development server
npm run build    # Create a production build
npm run lint     # Run ESLint
npm test         # Build and run project tests
```

## Notes

- The backend is implemented with Next.js API routes inside this same project.
- There is no separate Express or standalone backend service.
- The database layer is server-side only.
- The testing table is intentionally unauthenticated for review and debugging.
- Admin authentication is intentionally not implemented for this exercise.
