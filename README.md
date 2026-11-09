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
- `GET /v1/map/current` — current immutable map release and its source commit.
- `GET /v1/map/releases/:id/manifest.json` — file hashes, sizes and release coverage.
- `GET /v1/map/releases/:id/:path` — allowlisted runtime map files from pinned Git LFS objects.

Public API supports cross-origin GET/HEAD from finfolk.com.au. Writes return 405; `/admin` returns 404. The application pins a complete map release rather than following a mutable catalog. The initial map release has 79 regions, 16 with contours, and no numeric rasters: acquisition integrity alone does not verify vertical datum and survey quality.

`map-releases.json` pins each map manifest to a source commit in `hoebat/finfolk-next`. Setup fetches metadata and verifies every Git LFS pointer against its stored-byte hash and size. Runtime responses stream those immutable LFS objects; JSON/GeoJSON use HTTP gzip, while numeric `.f32.gz` chunks retain their browser-decoded compression. `data/downloads.json` contains hashes of decoded browser bytes. Preserve old descriptors and source commits so saved regions and application rollback keep working. See `finfolk-next/docs/DATASET_RELEASES.md` for building and registering a new release.

Explore's PBF vector tiles are packed by source and zoom into reversible Git LFS
archives. The service checks archive and tile hashes and serves exact tile bytes
through the same immutable release URLs. A bounded cache deduplicates concurrent
archive reads; its reset fences in-flight reads from repopulating cleared state.
Run `node scripts/verify-map-release.mjs` after publication to verify the live
compression boundary, CORS, catalog, survey contours and vector tile checksums.

## FinFolk design system

The catalogue keeps its dataset-specific navigation: Overview, All datasets, and state collections in a desktop sidebar and horizontally scrolling menus on mobile. FinFolk typography, identity and theme colours are retained. Theme definitions and SVG identity are copied from `hoebat/finfolk-next` commit `d879835e9493564c95b617187c84ee2478abecdd` (`src/appearance.js`, `src/finfolk-{wordmark,mark,icon}.svg` in the web-main package). Preserve their provenance when refreshing them. The four themes use the same `finfolk-theme` preference key; browser storage remains separate for each hostname.
