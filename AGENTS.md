# StegoLab development guide

StegoLab is a static browser application. Product pages are Home, Embed, Extract, Inspect and About. The source lives in frontend/; synthetic browser acceptance tests in e2e/.

## Commands

- Install: npm ci --prefix frontend
- Develop: npm run dev --prefix frontend
- Narrow tests: npm test --prefix frontend -- src/lib/payload.test.ts
- Quality: npm run lint --prefix frontend; npm run typecheck --prefix frontend; npm test --prefix frontend
- Build: npm run build --prefix frontend
- Preview: npm run preview --prefix frontend
- Browser checks: npm ci --prefix e2e, then node e2e/node_modules/@playwright/test/cli.js install chromium, then npm test --prefix e2e

## Engineering and security

Use the shared browser modules in frontend/src/lib for every flow. Keep framing, cryptography and carrier parsing there. Never log or persist passwords, derived keys, payloads, extracted content or full local paths. Validate signatures, lengths, parser results and capacity before processing. Never execute uploaded or extracted files. Do not add network uploads, storage, accounts or operation records.

Run the narrowest meaningful test after a change, then the affected suite. Record actual commands and results in docs/VALIDATION.md. Exercise saved downloads and re-uploads against the production static build before advertising a format. Maintain docs/EXECUTION_PLAN.md and docs/BUILD_STATUS.md as milestones change.

## UI

Preserve the existing logo, graphite top navigation, ivory surfaces (with a matching dark theme from prefers-color-scheme), the single gold accent, local Manrope with JetBrains Mono for technical values, Phosphor icons, visible focus and reduced-motion support. Radii are 8px for controls and 14px for panels. Show the real mechanism (bit planes computed with the shared lib) rather than decorative imagery. Keep workflows simple; put technical explanations behind Format details or in About. Support desktop, tablet and mobile without horizontal overflow.

## Definition of done

A feature is complete only when the implementation is real, error paths are safe, critical tests pass and the production-browser journey has been exercised. Publish only intentional source, configuration, documentation and current synthetic screenshots. Do not create generated carriers, secrets or personal fixtures in public source.

