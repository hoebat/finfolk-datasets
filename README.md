# FinFolk datasets

Production catalogue for datasets.finfolk.com.au, organised by state and territory. This service publishes reviewed records and a versioned read-only JSON API. Admin editing is not enabled: the Atelier prototype retains its local proposals until a Git-backed administration workflow is implemented.

## Data ownership

Original ocean downloads remain in the existing FinFolk Git LFS repository. The catalogue snapshot is also an LFS object in `hoebat/finfolk-app`. `data-release.json` pins its repository, commit, path and SHA-256. Builds verify both the committed LFS pointer and the materialized object; pointer text cannot be published as JSON. No database or object store becomes authoritative. Deployment bundles contain materialized copies, not replacement originals. Published product URLs currently retain their existing FinFolk delivery locations.

## Build and release

Clone `https://github.com/hoebat/finfolk-app` beside this checkout as `finfolk-atelier`, check out the commit in `data-release.json`, and run `git lfs pull --include=design-board/assets/datasets/catalogue.json`. Then run `npm run build` and `npm test`. Alternatively pass an explicit data checkout to `node scripts/build.mjs /absolute/data/checkout`. Node 22+; no runtime dependencies.

To update data, commit and push the LFS object in the data repository, update the pinned release here, rebuild, test, then publish through Sites. Source belongs in this repository; generated `dist` is excluded from Git and packaged as the deployment artifact.

## API

- `GET /v1/catalogue` — published records; optional `state`, `family`, `q` filters. Shared national records appear in state views.
- `GET /v1/datasets/:id` — one published record and release provenance.
- `GET /v1/manifest` — release commit, checksum and snapshot date.
- `GET /health` — deployed source commit.

Public API supports cross-origin GET/HEAD from finfolk.com.au. Writes return 405; `/admin` returns 404. No numeric depth sampling is claimed. The main production map has not been switched to this API.
