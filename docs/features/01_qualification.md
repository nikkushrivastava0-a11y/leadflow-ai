# Lead qualification
Rules run first; optional Gemini only receives allowlisted local signals. Strict runtime schema rejects extra keys, inconsistent fit, unsafe text and scores outside 0–100. Every provider/configuration failure persists a usable fallback plus activity event. Insert-triggered jobs cover manual and public enquiries, with leased retries. Existing leads are not backfilled.

Manual setup: review PR55 first, create an encrypted backup and restore it to an isolated environment, rehearse migration 01, configure server-only GEMINI_API_KEY, an available GEMINI_MODEL, CRON_SECRET (32+ random characters), SUPABASE_SECRET_KEY and LEADFLOW_AUTOMATION_ENABLED=true. Invoke authenticated GET /api/cron/automation periodically. No hosted changes are performed by this PR. No new redirects; retain canonical APP_URL and Auth callback allowlist from PR55.

Risks: qualification is an estimate, not purchasing intent. Jobs can lag; model failure uses rules. Contact presence alone does not prove fit. A crashed sixth claim needs operator review. Monthly planning estimate at 1,000 leads: ₹0 if using rules or an eligible free model quota; reserve ₹0–300 for optional capped model use (illustrative budget, not a quote). No paid plan is enabled.

Rollback: disable LEADFLOW_AUTOMATION_ENABLED first and revert app commit. Keep additive tables and history. Destructive schema rollback 01 is for disposable staging only, after later migrations are reversed and history exported. Never restore broad grants or disable RLS.
