# Next.js migration status

The migration is being implemented on the working branch. Production remains on Sites until authentication, real Git LFS writes and Netlify acceptance pass. Do not cut over DNS early.

## Required operator configuration

1. Make `hoebat/finfolk-datasets` private in GitHub repository settings.
2. Create a GitHub App installed only on that repository. Grant Contents and Pull Requests read/write, Checks and Commit Statuses read. Set its ID, installation ID and private key as production-only Netlify secrets `GITHUB_APP_ID`, `GITHUB_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY`.
3. Set `NEON_AUTH_BASE_URL` to the existing FinFolk provider, `NEON_AUTH_COOKIE_SECRET` to a new random secret, `DATASET_ADMIN_IDS` to the existing verified FinFolk administrator IDs, and `APP_ORIGIN=https://datasets.finfolk.com.au`.
4. Enable Git LFS before Netlify checkout with `GIT_LFS_ENABLED=true`, `GIT_LFS_FETCH_INCLUDE=data/*.json`. Leave Netlify Git builds disabled: GitHub Actions owns deployments. Configure `NETLIFY_AUTH_TOKEN` in the repository's GitHub `production` environment; the workflow fixes the target site ID. PRs and draft branches validate without deploying.
5. Register the canonical dataset hostname and stable Netlify hostname as trusted origins in the existing Neon Auth branch. No new identity database is needed.
6. Verify actual login, admin denial for ordinary members, LFS save/reload, conflict rejection, CI validation, explicit publication and deployment confirmation before changing DNS.

The public projection is generated from local LFS catalogue data with review notes removed. GitHub draft saves upload the LFS payload and commit its pointer. `main` advances only through a non-forced fast-forward of the reviewed head after validation checks pass. Bulk survey files remain in their original LFS repositories; no bulk archive is downloaded by this build.

Netlify project created: `2994a09f-11bc-40e1-8a3a-d3e3a91455ff`, stable hostname `https://finfolk-datasets.netlify.app`. It is separate from the main FinFolk Netlify project. DNS has not been changed.

## Verification

Next.js 16.4.5 production compilation and strict TypeScript checks passed on Goloka in an isolated build directory. Five public API/schema tests passed. HTTP smoke checks passed for the public pages/API and fail-closed unconfigured auth/admin endpoints. The Neon SDK dependency tree required patched Better Auth 1.7.18 and Zod 4.6.7 overrides; production audit has no high or critical findings (seven low findings remain in transitive email-rendering dependencies). Live sign-in, GitHub App writes, concurrent editor acceptance and deployment cutover remain unverified until operator configuration is available.

The migration initially lacked local LFS clean-filter setup; a follow-up commit replaces the catalogue with its LFS pointer and adds a committed-pointer build gate. Squash the migration PR when eventually merging so main receives the LFS representation directly. Operator settings remain to be confirmed; the connector returned 403 for environment writes.

## CLI-first deployment rollout

Pinned CLI: 27.16.2. The Netlify OpenNext build and function/edge packaging passed on Goloka. `netlify deploy --remote` cannot be used for this unlinked project, and `--remote` cannot be combined with `--context`; the intended path is local CLI build/upload. CLI upload and deployed-site acceptance must pass before this PR is merged to enable main deployments. Netlify Next.js skew protection is unavailable for CLI deploys, so release commit/checksum verification is required.

### CLI upload test result

Netlify CLI 27.16.2 successfully built and packaged the Next.js app on Goloka with `netlify build --offline --context deploy-preview`. Actual upload/remote HTTP verification has not completed: draft remote-build deployment was rejected because this project intentionally has no Netlify Git connection; local clean dependency installation failed with npm `EIDLETIMEOUT`, and transferring the packaged output from Goloka failed with SSH timeouts (IPv4 and IPQoS fallback also tried). No deployment success is claimed. Keep this PR in draft and main deployment inactive until the local CLI upload and `scripts/verify-deployment.mjs` pass.

The workflow is prepared with PR-only validation, a main-only production deployment job, serialized deployments, stale-revision skipping, a fixed site-ID guard and deployed commit/checksum verification. It requires `NETLIFY_AUTH_TOKEN` in GitHub's production environment. No GitHub deployment secret was provisioned by the agent. Production DNS is unchanged.
