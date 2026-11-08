# SEO metadata rollout — marketing page only

This draft changes metadata, not the visual UI. It follows the founder's instruction to avoid generic redesigns and misleading performance claims.

## What it introduces

- Meaningful brand title and a development-status description. No more `Create Next App` metadata.
- Distinct titles and `noindex, nofollow` on login, dashboard and tenant enquiry forms; these pages do not belong in public search results.
- Generated `robots.txt` and `sitemap.xml`. On Vercel preview and development, `robots.txt` disallows crawling; production exposes the root marketing page while excluding internal routes.
- A sitemap that lists only the marketing homepage, **never customer form slugs or private routes**.
- Text-only OpenGraph/Twitter summary tags. **No image is claimed or referenced.** A founder-approved social sharing visual remains an uncompleted item.
- A validated optional `NEXT_PUBLIC_SITE_URL` for the canonical public origin. Without that variable, the existing production host `https://leadflow-ai-flame.vercel.app` is used.

## Operational caveats

- Robots directives and `noindex` are **not authentication or privacy controls**. Real Supabase authorization/RLS, headers and server checks remain essential.
- Current public homepage marketing text may overstate working AI functionality; those claims require a separate founder-approved copy/design audit before active promotion.
- Search Console submission, HTTPS inspection, real social previews, canonical HTTP status and production-domain verification are **not** performed by a build.
- A real production social image should be designed against `docs/DESIGN_REFERENCE_NOTES.md` from the unmerged 3D Agent Studio branch; do not auto-generate a generic SaaS card or pretend a file exists.
- Preview builds never imply the site is ready for commercial launch.

## Test before merge

1. On a preview deployment, visit `/robots.txt` and confirm `Disallow: /`.
2. Check `/sitemap.xml` contains only the canonical homepage, and no `/form` slug or `/dashboard`.
3. Inspect rendered page titles and robots meta for `/login`, `/dashboard`, and `/form/[slug]`. None should be indexed.
4. Verify metadata brand title and description on the homepage. Confirm no fake testimonials, traffic numbers, or missing social images in metadata.
5. Configure `NEXT_PUBLIC_SITE_URL` only after the official production host/domain is decided. Don't place credentials in that variable.
6. Confirm desktop/mobile layout is unchanged. Merge only with founder approval.

References:
- https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
- https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
- https://nextjs.org/docs/app/api-reference/functions/generate-metadata
