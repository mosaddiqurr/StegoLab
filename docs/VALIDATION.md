# Validation

Validated on 2026-10-04 with Node.js 24.15.0, npm 11.12.1 and Playwright 1.62.1. Browser checks used the freshly built static distribution.

## Reproducible checks

| Executed command | Result |
|---|---|
| `npm.cmd ci --prefix frontend --cache .npm-cache --no-fund` | Passed; 251 packages installed, zero reported vulnerabilities. |
| `npm.cmd ci --prefix e2e --cache .npm-cache --no-fund` | Passed; 3 packages installed, zero reported vulnerabilities. |
| `npm.cmd run lint --prefix frontend` | Passed. |
| `npm.cmd run typecheck --prefix frontend` | Passed. |
| `npm.cmd test --prefix frontend` | 4 files, 16 tests passed. |
| `npm.cmd run build --prefix frontend` | TypeScript and Vite production build passed, including a repeat after logo metadata cleanup. |
| `npm.cmd audit --prefix frontend --cache .npm-cache` | Zero reported vulnerabilities. |
| `npm.cmd audit --prefix e2e --cache .npm-cache` | Zero reported vulnerabilities. |
| `npm.cmd ls --prefix frontend --omit=dev --all` | Runtime dependency tree resolved without errors. |
| `npm.cmd test --prefix e2e -- --reporter=line` | 36 tests passed in 2.2 minutes. |
| `npm.cmd test --prefix e2e -- --reporter=line --grep 'Home, navigation\|mobile Home'` | 2 desktop/mobile navigation and layout tests passed after logo metadata cleanup. |
| `git diff --check -- README.md docs/VALIDATION.md` | Passed after simplifying the README button to a single Live Demo label on 2026-10-05. |

On other platforms, use `npm` in place of `npm.cmd`. Both lockfiles remained unchanged after installation.

## Browser coverage

The existing suite verified saved downloads and re-uploads for PNG, JPG/JPEG, BMP, WebP and PDF: Unicode text, binary SHA-256 comparison, and plain/password-protected payloads. It also covered wrong-password retry, corrupted data, unsupported and damaged carriers, missing payloads, capacity rejection, transparent PNG, 32-bit BMP, multi-segment JPEG, refresh, hash routes and project-subpath hosting.

Request guards found no uploads, application API calls or external application requests during workflows. Browser storage remained empty. Desktop, mobile, tablet and 320-pixel checks passed without horizontal overflow. No browser page errors were reported.

A temporary local probe (`node .cache/final-ui-probe.mjs`, not published) additionally passed logo/favicon loading, keyboard skip-link focus, reduced motion, empty-carrier rejection, the 40 MiB carrier limit, image dimension limits and animated-PNG rejection. Production captures of all four pages, mobile forms and a recovered result were visually inspected. The three desktop publication screenshots matched fresh captures byte for byte; the existing mobile screenshot also depicts the current UI.

## Publication checks and scope

Source, configuration, dependencies, scripts, documentation, licenses and the four publication screenshots were reviewed. Searches found no real credentials, private keys or personal machine paths in eligible publication files. The absolute path in the filename unit test is synthetic. No upload, persistent-storage or user-content execution code was found in the application. Embedded development-tool provenance metadata was removed from the logo PNG; its header and compressed image-data chunks remain byte for byte unchanged. A direct Chromium pixel comparison (`node --input-type=module`) confirmed identical decoded RGBA pixels at 1254 by 1254. The original file is retained in an ignored local cache. No unwanted tool attribution remains in eligible publication files.

Git's ignore matching was checked using a temporary isolated metadata directory, without initializing the project. Dependencies, distribution files, caches, generated carriers, test outputs and the three internal planning/status/release documents were excluded. There are 53 eligible source/configuration/documentation/asset files and none exceeds 5 MiB. The published logo hash is `2429EDC7D5485780232CB9BAAC255B5D68AAB851332441A55FA29F9D07FB5388`.

`git status --short` confirmed that this project directory has no Git metadata. Tracked files, history and configured remotes therefore could not be inspected. No project initialization, staging, commit, tag, push or remote modification was performed.

`node e2e/node_modules/@playwright/test/cli.js install chromium` stalled without output and was interrupted. The matching Chromium v1234 browser was already cached; `install --dry-run chromium` confirmed its path, and the complete browser suite and additional probe ran successfully with it. A fresh browser download was not verified.

Hosted CI, public hosting, remote-repository state, Firefox/WebKit and physical devices were not validated. Browser emulation and local acceptance do not establish those results. Browser decoders and pdf-lib remain parser trust boundaries; page/object limits are checked after PDF parsing and do not bound every parser allocation. The security notes and README describe the remaining format, privacy and transformation limitations.
