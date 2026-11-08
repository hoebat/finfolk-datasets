# FinFolk datasets on Goloka

The GitHub source repository is `git@github.com:hoebat/finfolk-datasets.git`, branch `main`. Keep this project separate from the main application and Atelier.

SSH access from the originating Mac:

```sh
ssh zcaudate@goloka.tail15d041.ts.net
```

Use the established Tailscale hostname and verified SSH host key. Do not copy private credentials or environment files between machines.

The development checkout is `/Users/zcaudate/Development/greenways/finfolk-datasets`.

```sh
cd /Users/zcaudate/Development/greenways
git clone git@github.com:hoebat/finfolk-datasets.git
cd finfolk-datasets
npm run setup
npm run dev
```

Prerequisites: Node 22+, Git and Git LFS. No npm dependency install is required. `npm run setup` fetches the pinned catalogue's Git metadata and materializes only its Git LFS object into ignored `.cache/catalogue-source`, validates its size/checksum, builds and runs the service tests. The current catalogue is 294,850 bytes; bulk ocean surveys are not fetched. Existing main application and Atelier checkouts are not modified.

Local preview is loopback-only at `http://127.0.0.1:8786`. To open it from the originating Mac while it runs on Goloka:

```sh
ssh -N -L 8786:127.0.0.1:8786 zcaudate@goloka.tail15d041.ts.net
```

Then visit `http://127.0.0.1:8786` locally. Choose another local forwarding port if 8786 is occupied. The preview is an on-demand development process; setup does not install a persistent service or change production.

After pulling later changes, run `npm run setup` again if `data-release.json` changes. Run `npm run build` and `npm test` for ordinary code changes.

Production remains on Sites at https://datasets.finfolk.com.au. Pushing GitHub source or running setup does not deploy it. Read `HANDOFF.md` and the Sites skill before publishing. Source data remains authoritative in Git LFS; checked-out caches and deployment bundles are reproducible copies.
