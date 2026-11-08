# Next.js migration status

The migration is being implemented on the working branch. Production remains on Sites until authentication, real Git LFS writes and Netlify acceptance pass. Do not cut over DNS early.

## Required operator configuration

1. Make `hoebat/finfolk-datasets` private in GitHub repository settings.
2. Create a GitHub App installed only on that repository. Grant Contents and Pull Requests read/write, Checks and Commit Statuses read. Set its ID, installation ID and private key as production-only Netlify secrets `GITHUB_APP_ID`, `GITHUB_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY`.
3. Set `NEON_AUTH_BASE_URL` to the existing FinFolk provider, `NEON_AUTH_COOKIE_SECRET` to a new random secret, `DATASET_ADMIN_IDS` to the existing verified FinFolk administrator IDs, and `APP_ORIGIN=https://datasets.finfolk.com.au`.
4. Enable Git LFS before Netlify checkout with `GIT_LFS_ENABLED=true`, `GIT_LFS_FETCH_INCLUDE=data/*.json`. Connect Netlify's GitHub integration to private `origin/main`. Disable branch/PR deploys for catalogue drafts.
5. Register the canonical dataset hostname and stable Netlify hostname as trusted origins in the existing Neon Auth branch. No new identity database is needed.
6. Verify actual login, admin denial for ordinary members, LFS save/reload, conflict rejection, CI validation, explicit publication and deployment confirmation before changing DNS.

The public projection is generated from local LFS catalogue data with review notes removed. GitHub draft saves upload the LFS payload and commit its pointer. `main` advances only through a non-forced fast-forward of the reviewed head after validation checks pass. Bulk survey files remain in their original LFS repositories; no bulk archive is downloaded by this build.

Netlify project created: `2994a09f-11bc-40e1-8a3a-d3e3a91455ff`, stable hostname `https://finfolk-datasets.netlify.app`. It is separate from the main FinFolk Netlify project. DNS has not been changed.

## Verification

Next.js 16.4.5 production compilation and strict TypeScript checks passed on Goloka in an isolated build directory. Five public API/schema tests passed. HTTP smoke checks passed for the public pages/API and fail-closed unconfigured auth/admin endpoints. The Neon SDK dependency tree required patched Better Auth 1.7.18 and Zod 4.6.7 overrides; production audit has no high or critical findings (seven low findings remain in transitive email-rendering dependencies). Live sign-in, GitHub App writes, concurrent editor acceptance and deployment cutover remain unverified until operator configuration is available.
