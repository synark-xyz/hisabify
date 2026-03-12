# Supabase Setup

This document covers how to run and test Supabase schema changes for Hisabify in local, staging, and production environments.

## Prerequisites

- Install dependencies:

```bash
npm install
```

- Install the Supabase CLI if you do not already have it:

```bash
npm install -g supabase
```

- Authenticate the CLI if you need to work with hosted projects:

```bash
supabase login
```

- Run commands from the repo root:

```bash
cd /Users/sadat.sayem/Biz/contributions/hisabify
```

## Project Structure

- Migrations live in `supabase/migrations/`
- Generated database types live in `src/integrations/supabase/types.ts`
- Local config lives under `supabase/`

## Local

Use local Supabase first to verify migrations before touching hosted environments.

### Start local Supabase

```bash
npx supabase start
```

This starts the local Supabase stack, including Postgres.

### Stop local Supabase

```bash
npx supabase stop
```

### Apply all migrations from scratch

Use this when you want a clean local database and to verify the full migration chain.

```bash
npx supabase db reset --local
```

This drops and recreates the local database, then reapplies every migration in `supabase/migrations/`.

### Apply only pending migrations locally

Use this when your local stack is already running and you only want to apply newly added migrations.

```bash
npx supabase db push --local
```

### Preview pending local migrations

```bash
npx supabase db push --local --dry-run
```

### Check migration status

```bash
npx supabase migration list
```

### Regenerate local TypeScript types

After schema changes, regenerate the checked-in types:

```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### Recommended local workflow

```bash
npx supabase start
npx supabase db reset --local
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
npm run test
npm run build
```

## Staging

Use staging after local validation passes.

### Link the staging project

If not already linked:

```bash
npx supabase link --project-ref <STAGING_PROJECT_REF>
```

You can also re-link at any time if you want to switch environments.

### Push pending migrations to staging

```bash
npx supabase db push
```

This applies local pending migrations to the linked hosted project.

### Preview staged migration changes

```bash
npx supabase db push --dry-run
```

### Pull schema from staging

Use this only if the hosted schema changed outside local migrations and you need to sync it back:

```bash
npx supabase db pull
```

If you pull schema changes, review the generated migration carefully before committing it.

### Regenerate types from staging

```bash
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

### Recommended staging workflow

```bash
npx supabase link --project-ref <STAGING_PROJECT_REF>
npx supabase db push --dry-run
npx supabase db push
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

## Production

Production should only be updated after local and staging validation.

### Link the production project

```bash
npx supabase link --project-ref <PROD_PROJECT_REF>
```

Double-check that you linked the correct project before pushing migrations.

### Preview production migration changes

```bash
npx supabase db push --dry-run
```

### Push pending migrations to production

```bash
npx supabase db push
```

### Generate production-linked types if needed

Normally staging-linked or local-generated types are enough if schemas match, but if needed:

```bash
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

### Recommended production workflow

```bash
npx supabase link --project-ref <PROD_PROJECT_REF>
npx supabase db push --dry-run
npx supabase db push
```

## Environment Switching

Because `supabase link` points the CLI at one hosted project at a time, switch explicitly before staging or production work.

### Link staging

```bash
npx supabase link --project-ref <STAGING_PROJECT_REF>
```

### Link production

```bash
npx supabase link --project-ref <PROD_PROJECT_REF>
```

### Verify current status

```bash
npx supabase status
```

For local development, `npx supabase status` also shows local service URLs when the stack is running.

## Troubleshooting

### Migration fails locally

Try a clean rebuild:

```bash
npx supabase db reset --local
```

If it still fails, inspect the exact SQL error and fix the migration rather than skipping it.

### Hosted migration history is out of sync

Inspect migration state:

```bash
npx supabase migration list
```

Do not manually edit migration history unless you are certain of the state of the target database.

### Types are stale

Regenerate after schema changes:

```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

or for linked hosted env:

```bash
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

### Local stack is not running

Start it first:

```bash
npx supabase start
```

## Safe Order Of Operations

1. Add or update migration files in `supabase/migrations/`
2. Run `npx supabase start`
3. Run `npx supabase db reset --local`
4. Regenerate types
5. Run app verification (`npm run test`, `npm run build`)
6. Push to staging
7. Validate staging
8. Push to production

## Notes

- Prefer `db reset --local` for full local verification.
- Prefer `db push --dry-run` before any hosted push.
- Do not test new migrations in production first.
- Keep `src/integrations/supabase/types.ts` in sync with the latest schema when schema-dependent app code changes.
