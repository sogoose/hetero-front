# GitHub Pages deployment — HETERO FRONT

The **only** website publisher is `.github/workflows/publish-lightweight-pages.yml`.
It stages all live pages, research figures, building photos, SVGs, fonts and
optimized material WebPs, excluding material source PNGs **only from the
deployed site** (not from the Git repository).

**Required repository setting (one-time):**
GitHub repository **Settings → Pages → Build and deployment → Source:
GitHub Actions**. Do **not** leave Source as "Deploy from a branch", which
starts GitHub's parallel dynamic `pages build and deployment` workflow on
each commit. That collides with the custom publisher, producing
`Deployment request failed due to in progress deployment` and sometimes
`syncing_files` timeouts.

Changes to main are published by the lightweight workflow, with a shared
concurrency group that queues the newest run behind an active deployment.
The reference-figure cache helper is manual and only requests a publish if
it really committed files; it must not run on every push.

The Node.js 20 deprecation notice is a separate upstream action warning,
not the deployment collision error.
