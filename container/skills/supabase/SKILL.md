---
name: supabase
description: Manage Supabase database, run migrations, and interact with your project
---

Use the `supabase` CLI and direct SQL via the service key. `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `SUPABASE_ACCESS_TOKEN` are pre-configured.

Common patterns:
- Query data: use the Supabase REST API with `curl -H "apikey: $SUPABASE_SERVICE_KEY" $SUPABASE_URL/rest/v1/tablename`
- Run SQL: `supabase db execute --project-ref <ref> --sql "SELECT ..."`
- List projects: `supabase projects list`
- Check migrations: `supabase migration list --project-ref <ref>`

For complex queries, prefer the REST API with the service key over the CLI.
