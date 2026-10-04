# Browser acceptance tests

Build the application first, then run:

```sh
npm ci --prefix e2e
node e2e/node_modules/@playwright/test/cli.js install chromium
npm test --prefix e2e
```

The runner serves only frontend/dist on port 5194. It closes its own static server when tests finish. No application service is started. Synthetic PNG, JPEG, BMP, WebP, PDF and binary inputs are generated in the ignored e2e/.fixtures directory. Test outputs are ignored.

Desktop checks cover each format with text, binary files and password protection, exact recovered text, downloaded binary hashes, capacity and corruption failures, wrong passwords, refresh, privacy and project subpaths. Mobile checks cover every page, small screens, tablet layout, encrypted PNG binary recovery and PDF recovery.

Screenshots use actual pages and synthetic content. Intentional publication screenshots are copied to docs/screenshots; transient outputs stay ignored. Browser viewport emulation does not replace testing on physical devices.

