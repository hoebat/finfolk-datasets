# FinFolk datasets

Source repository: https://github.com/hoebat/finfolk-datasets (`origin/main`). The `sites` remote retains the Sites-managed publishing repository; GitHub pushes alone do not deploy the website.

Production catalogue for datasets.finfolk.com.au, organised by state and territory. This service publishes reviewed records and a versioned read-only JSON API. Admin editing is not enabled: the Atelier prototype retains its local proposals until a Git-backed administration workflow is implemented.

## Data ownership

Original ocean downloads remain in the existing FinFolk Git LFS repository. The catalogue snapshot is also an LFS object in `hoebat/finfolk-app`. `data-release.json` pins its repository, commit, path and SHA-256. Builds verify both the committed LFS pointer and the materialized object; pointer text cannot be published as JSON. No database or object store becomes authoritative. Deployment bundles contain materialized copies, not replacement originals. Published product URLs currently retain their existing FinFolk delivery locations.

## Quick setup and Goloka

Requires Node 22+, Git and Git LFS. After cloning this repository, run:

```sh
npm run setup
npm run dev
```

Setup fetches only the pinned catalogue metadata and one bounded Git LFS object into ignored `.cache/catalogue-source`, verifies its checksum, builds the service and runs the checks. It does not clone an Atelier working tree or download bulk survey archives. Subsequent `npm run build` uses this cache. See [GOLOKA.md](GOLOKA.md) for the remote checkout and access instructions.

## Build and release

Clone `https://github.com/hoebat/finfolk-app` beside this checkout as `finfolk-atelier`, check out the commit in `data-release.json`, and run `git lfs pull --include=design-board/assets/datasets/catalogue.json`. Then run `npm run build` and `npm test`. Alternatively pass an explicit data checkout to `node scripts/build.mjs /absolute/data/checkout`. Node 22+; no runtime dependencies.

To update data, commit and push the LFS object in the data repository, update the pinned release here, rebuild, test, then publish through Sites. Source belongs in this repository; generated `dist` is excluded from Git and packaged as the deployment artifact.

## API

- `GET /v1/catalogue` — published records; optional `state`, `family`, `q` filters. Shared national records appear in state views.
- `GET /v1/datasets/:id` — one published record and release provenance.
- `GET /v1/manifest` — release commit, checksum and snapshot date.
- `GET /health` — deployed source commit.

Public API supports cross-origin GET/HEAD from finfolk.com.au. Writes return 405; `/admin` returns 404. No numeric depth sampling is claimed. The main production map has not been switched to this API.

## FinFolk design system

The catalogue keeps its dataset-specific navigation: Overview, All datasets, and state collections in a desktop sidebar and horizontally scrolling menus on mobile. FinFolk typography, identity and theme colours are retained. Theme definitions and SVG identity are copied from `hoebat/finfolk-next` commit `d879835e9493564c95b617187c84ee2478abecdd` (`src/appearance.js`, `src/finfolk-{wordmark,mark,icon}.svg` in the web-main package). Preserve their provenance when refreshing them. The four themes use the same `finfolk-theme` preference key; browser storage remains separate for each hostname.
