# FinFolk datasets agent handoff

Updated 8 November 2026, Australia/Melbourne.

The dataset catalogue is live at https://datasets.finfolk.com.au. Its public interface and read-only API are deployed. Git-backed administration and connecting the production map to this service remain unfinished. The latest user request is to hand this work to the next agent.

## User decisions to preserve

- Keep all dataset data authoritative in Git LFS. Deployment artifacts can contain checked-out copies; do not silently move authoritative storage into a database or object store.
- Organise dataset collections by Australian state and territory, with national/shared records referenced across relevant collections.
- Use FinFolk colours, identity, typography and the four themes: Acid Club, Blue Hour, Salt Paper and Night Swim.
- **Keep dataset navigation: Overview, All datasets and state collections. Do not restore Explore, Community, Events, Practice or You as the dataset site's menus.** The user explicitly removed those global product menus after the theme update.
- Administration must eventually save real Git changes. Atelier's browser-local proposals are a prototype, not operational administration.

## Repositories and source ownership

Workspace: `/Users/chris/Development/greenways`.

| Checkout | Purpose | Current relevant state |
| --- | --- | --- |
| `finfolk-datasets` | New production catalogue service | GitHub `hoebat/finfolk-datasets` (`origin/main`), with a separate `sites` publishing remote; deployed source commit `5029d6da23a0f2aa125c1bc99c9bfedac443e1f4` |
| `finfolk-next` | Main production app, API and ocean data | GitHub `hoebat/finfolk-next`; HEAD observed `d879835e9493564c95b617187c84ee2478abecdd`; unrelated local ocean work is present |
| `finfolk-atelier` | Local design studies and current catalogue snapshot | GitHub `hoebat/finfolk-app`; branch `handoff/atelier-goloka-2026-11-07`; HEAD `1ca2f678a0e10d26818fc2a939a9861c9b28a2ab` |

Read `finfolk-next/AGENTS.md` before modifying that app. Backend operation declarations belong in Clojure/XTalk under `src-app/finfolk_web`; generated JavaScript must be regenerated. Next.js UI is authored under `js/finfolk-next/site/web-main/app`, which has additional AGENTS instructions. Do not read dependencies from sibling repositories when working in finfolk-next.

Do not use historical Atelier production deployment commands or its stale CNAME. Atelier is separate from the current production application.

## Production deployment

The source repository is https://github.com/hoebat/finfolk-datasets. `origin` points to GitHub, and `main` tracks `origin/main`. The previous managed remote is retained as `sites`. Push source changes to GitHub; publish through the Sites workflow separately. A GitHub push alone does not deploy the website.

The dataset service is hosted with the Sites plugin as a Cloudflare Worker ES module. It is public. Main FinFolk remains on its existing Netlify frontend and Cloudflare API infrastructure.

- Canonical URL: https://datasets.finfolk.com.au
- Platform URL: https://finfolk-datasets.zcaudate.chatgpt.site
- Sites project ID: `appgprj_6aefad4cf5308191945a43fd8eeaaf42`
- Identity/config file: `.openai/hosting.json`; reuse its ID, never create a replacement site.
- Latest saved version: `appgprj_6aefad4cf5308191945a43fd8eeaaf42~appgver_822d7a4a0af481918b787d898bdb79d8`
- Latest deployment: `appgdep_6aefb13b9a708191a31c5ed8df841502`, succeeded, version 3.
- Cloudflare zone: `04d49ee52e000c5114e87783ed35adf2`; account: `b048221dbe18365ea667373f6fda1f73`.
- DNS-only CNAME `datasets.finfolk.com.au` → `custom-domains.chatgpt.site`; verification TXT records are configured. Hostname and TLS were verified working.

Read the Sites skill before the next site edit:
`/Users/chris/.codex/plugins/cache/openai-curated-remote/sites/1.1.4/skills/sites/SKILL.md`.

For existing-site work: get the site and a fresh source repository write credential, open through the source helper, edit/build/check, package and push the exact source through that helper, save a version, then deploy that saved version with the public deployment operation. Credentials expire; obtain new ones rather than reusing values from conversation history. Keep credentials in memory and pass them through stdin, never source files, command arguments or logs.

Helper root: `/Users/chris/.codex/plugins/cache/openai-curated-remote/sites/1.1.4/scripts/`.
The workflow helper is `site-workflow.mjs --project-id <exact project ID>`; launch in a TTY, then send its JSON input as documented in the skill. Deployment archives must be outside the checkout, e.g. `/tmp/finfolk-datasets-release.tar.gz`.

Only documentation is being added for this handoff; no new site release is required for it.

## Implementation and verification

The service has no installed runtime dependencies and uses Node 22+ for local build/checks.

```bash
cd /Users/chris/Development/greenways/finfolk-datasets
npm run build
npm test
npm run dev
```

Local preview: http://127.0.0.1:8786. Stop the owned server after QA. No dataset preview server was left running by the deployment work.

- `src/index.html`: dataset sidebar, page shell, filters and record dialog.
- `src/styles.css`: FinFolk theme tokens, cards, typography and responsive layout. Mobile menus scroll horizontally; there is no global product bottom navigation.
- `src/appearance.js`: FinFolk's actual four theme definitions and saved-preference bootstrap.
- `src/finfolk-{wordmark,mark,icon}.svg`: FinFolk vector identity.
- `src/app.js`: catalogue browsing, query-string navigation, state/family/region filters, record tabs and theme selector.
- `src/worker.mjs`: read-only API and static response routing.
- `scripts/build.mjs`: verifies the committed Git LFS pointer and checked-out data hash, filters to published records, and embeds the catalogue and frontend files into `dist/server/index.js`.
- `data-release.json`: pinned source provenance.
- `tests/service.test.mjs`: four passing service tests covering public records, filters, unpublished record rejection, write rejection, routes and response contracts.
- `dist/`: ignored generated deployment output. Edit source files, then rebuild.

Identity/theme assets came from finfolk-next commit `d879835e9493564c95b617187c84ee2478abecdd`. The theme key is `finfolk-theme`; localStorage is separate per hostname, so preferences do not automatically synchronise between the main and dataset sites.

Verified after version 3: custom-host HTTPS, restored sidebar markup, absence of global product navigation, retained theme selector. Earlier checks verified all four theme definitions and their saved resolution, API responses, and 16 published GeoJSON links returning 200 with `application/geo+json`. Browser visual verification remains outstanding; computer-use browser access did not complete successfully. Do not describe HTTP or model checks as visual QA.

## Current data and API contract

The authoritative catalogue snapshot currently lives in Atelier, in Git LFS:

- Repository: `https://github.com/hoebat/finfolk-app`
- Commit: `1ca2f678a0e10d26818fc2a939a9861c9b28a2ab`
- Path: `design-board/assets/datasets/catalogue.json`
- LFS SHA-256: `439b75a180c976bb52a725355c6c3c6d5fc4cf7145ac9dfa5f56eb9604622fb3`
- Size: 294,850 bytes.

The pointer and LFS object were committed and pushed to the handoff branch. The snapshot contains 32 records. Production exposes 17 published records: 16 contour products and one national site-reference record. Acquisition/review records and Atelier-only landforms are not public releases. The snapshot is dated 7 November 2026 and is not a live download queue.

Builds read the adjacent `../finfolk-atelier` checkout by default, or an explicit argument to `node scripts/build.mjs /absolute/data/checkout`. They require the pinned Git object and matching materialized file. On another machine, check out the pinned revision and fetch only the required LFS file when possible; avoid accidentally downloading all multi-GB survey originals.

Original ocean survey data remains in finfolk-next's existing LFS paths. Current public product URLs still point to `https://finfolk.com.au/data/contours/*.geojson`; this release has not relocated those payloads to the dataset hostname. The new service is a catalogue and metadata API, not yet an independent host for all map assets.

Endpoints:

- `GET /v1/catalogue` — public catalogue; optional `state`, `family`, `q` filters.
- `GET /v1/datasets/:id` — one published record.
- `GET /v1/manifest` — release provenance and snapshot date.
- `GET /health` — health and the **data source commit**, not the service code commit.
- GET/HEAD/OPTIONS support public CORS. Writes return 405. `/admin` returns 404.

No numeric depth sampling is provided. The 17 public records must not be interpreted as the complete production map layer manifest.

## Remaining work and recommended sequence

The user said “let's look at doing that” after being told admin editing and map integration were pending. Investigation was completed; neither capability was implemented during the menu/theme changes.

### 1. Define the production source and Git editing workflow

Use a stable production-owned catalogue location and release schema. Moving the current catalogue snapshot out of Atelier into finfolk-next's dataset tree is a reasonable next design decision, but **has not happened**. Preserve all LFS originals and provenance.

Distinguish saving a draft from publishing a map release. An admin save should create a reviewable branch/commit or PR, with a base revision to detect concurrent edits. Review/publish should validate the release before advancing the public version. Do not use GitHub's normal file-contents API to store actual dataset payloads as ordinary Git blobs; an LFS write must upload the object and commit its pointer, or use a Git/LFS-capable job.

### 2. Reuse FinFolk administration

Main FinFolk already verifies Neon/Better Auth JWTs in `finfolk-next/backend/api.mjs` via `managedVerifier`. Existing environment administration checks a verified identity plus the server-side admin allowlist (`INSTAGRAM_ADMIN_IDS`), in `backend/environment-admin.mjs` and `backend/instagram-actions.mjs`.

Recommended initial approach: a protected FinFolk account route such as `/account/datasets`, linked from the dataset site, using the existing main API and login. This avoids introducing a second account system. That route and link do not exist yet. If administration must be directly hosted on the dataset site, first resolve the Sites authentication integration: Sites has its own hosted identity flow. Do not assume a FinFolk session automatically authenticates a Sites visitor.

The dataset site's runtime environment had **no configured variables** when checked. There is no configured server-side GitHub App credential for this workflow. Interactive Git access and the agent's GitHub connector are not automatically available to deployed application code. Configure a narrowly scoped server integration before enabling real saves; never expose its credentials in browser bundles. No new database storage is required just to retain files or Git review history.

### 3. Publish a map-compatible manifest before cutover

The production Discover map currently fetches:
`https://finfolk.com.au/data/explore-contours/manifest.json`.

Verified live: **82 vector contour sources: 16 survey + 66 regional**. The dataset catalogue exposes only the 16 survey product records. Switching the map directly to `/v1/catalogue` would lose the existing manifest contract and regional sources.

Relevant authored UI files in finfolk-next:

- `js/finfolk-next/site/web-main/app/(atlas)/atlas/explore-contours.js`
- `js/finfolk-next/site/web-main/app/(atlas)/atlas/explore-engine.js`
- `js/finfolk-next/site/web-main/app/(atlas)/atlas/explore-map.jsx`

The loader expects `version: 1` and `sources`, including bounds, zoom limits, attribution, kind and tile templates. It currently resolves tile paths with `location.origin + path`; cross-host delivery needs proper URL resolution. Keep viewport-based vector tile loading rather than replacing it with full GeoJSON downloads.

Publish a versioned map manifest covering all 82 existing sources, with correct delivery URLs. Validate tile availability/CORS and a known-good release/fallback strategy, then update the main map through its normal generated-code and build checks. No production map cutover has been performed.

### 4. Validate the end-to-end flow

Check anonymous denial, permitted admin access, draft persistence to Git/LFS, conflict handling, review and publish, immutable release provenance, and map rendering of both survey and regional sources. Theme and menu changes must remain independent of data publication.

## Preserve unrelated work

finfolk-next has active, unrelated local ocean data work. At handoff it includes modified `datasets/ocean/records/vcdem-2021.json` and `docs/OCEAN_DATA_HANDOFF.md`, plus untracked coastal acquisition scripts, tests, provenance, extracted data and `docs/OCEAN_COASTAL_EXTRACTS.md`. Inspect the latest status and do not overwrite, broadly stage or discard these.

finfolk-atelier also has uncommitted Bondi depth/survey studies, their data assets, tests, package changes and screen registrations. The studies include real 5 m Bondi crop data, 3D comparison, survey footprints and landform legends. Preserve them. They are not automatically production releases.

Main application database work follows the existing fresh rebuild/seed/import/verify/replacement direction. Do not invent an in-place production migration to implement this catalogue workflow. Never commit `.env`, `.cache`, `.neon`, `.wrangler`, operator snapshots or credentials.
