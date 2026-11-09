# FinFolk datasets

Source: https://github.com/hoebat/finfolk-datasets (`origin/main`). The Next.js/Netlify migration is in progress. The current production domain still runs the previous Sites release; see [MIGRATION.md](MIGRATION.md) for deployment gates and required operator configuration.

## Development

Node 22+ and Git LFS are required.

```sh
npm ci
git lfs install --local
git lfs pull --include='data/*.json'
npm run build
npm test
npm run dev
```

Preview: http://127.0.0.1:8786. `npm run setup` materializes catalogue data and builds after dependencies are installed. Original survey archives remain in their existing LFS repositories; no bulk download is needed.

## Data ownership

`data/catalogue.json` is authoritative and tracked with Git LFS. `data-release.json` records its hash and original Atelier provenance. Builds validate the materialized file and generate a public-only snapshot in ignored `.generated`. Review notes and unpublished records stay server-side. Public APIs serve the built snapshot, while admin reads and writes use GitHub branches and LFS objects. GitHub pushes alone do not cut production DNS over to Netlify.

## Interfaces

- `/` — state collections, Overview and All datasets, retaining FinFolk identity and four themes.
- `/v1/catalogue` — published records; optional `state`, `family`, `q`.
- `/v1/datasets/:id`, `/v1/manifest`, `/health` — record and release metadata.
- `/admin` — authorised metadata editing and Git-backed draft/review/publication.
- `/v1/admin/catalogue`, `/v1/admin/drafts` — authenticated administration APIs.
- `/auth/sign-in`, `/api/auth/*` — existing FinFolk Neon Auth provider, through its Next.js integration.

Administration returns unavailable until both auth and GitHub App configuration exist. Never put secrets in `NEXT_PUBLIC_*` variables. See `.env.example` for configuration names only.

The current catalogue has 32 records and 17 published products. It is not the full production map's 82-source vector manifest. Main-map integration, bulk file uploads and numeric sampling remain separate work.

Historical implementation and deployment context: [HANDOFF.md](HANDOFF.md). Remote development: [GOLOKA.md](GOLOKA.md).

## Deployment ownership

GitHub Actions owns deployment: PRs validate without deployment credentials; validated `main` pushes and manual runs on `main` deploy through pinned Netlify CLI 27.16.2 to site `2994a09f-11bc-40e1-8a3a-d3e3a91455ff`. Configure `NETLIFY_AUTH_TOKEN` in the GitHub `production` environment. `NETLIFY_SITE_ID` may be set there but must match that project. Netlify Git builds and branch deploys stay disabled. Runtime auth/GitHub App secrets stay in Netlify.

Production activation remains gated on the CLI smoke test and migration acceptance. Do not merge the migration to enable automated deployments before those gates pass. CLI deployments currently do not support Netlify Next.js skew protection; deployment verification checks the actual release commit instead.

The CI toolchain follows finfolk-next: checkout/setup-node v6, Node 22, an offline Netlify adapter build, and packaged-output checks. This project retains its own site ID, npm build command and dataset API routes; main-app Java/Clojure/Python build steps and FINFOLK_API_ORIGIN rewrites are not applicable here.
