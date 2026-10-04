# Security and privacy

Normal operations read File objects and generate Blob downloads inside the browser. The application sends no user file, payload or password to a service. The production policy uses connect-src 'none' and object-src 'none'; user content is never executed or rendered as HTML. Text is escaped by React; recovered files are offered as downloads with sanitized basenames.

Password protection uses browser Web Crypto AES-256-GCM, a random 16-byte salt, a random 12-byte nonce and PBKDF2-HMAC-SHA-256 at 600000 iterations. Filename, MIME and payload digest are inside the authenticated encrypted body. The framing header is authenticated too. Keys are non-extractable and passwords are cleared from form state after processing. JavaScript and browser internals do not provide guaranteed memory erasure.

[Web Crypto deriveKey documentation](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey) describes the standard primitives; [OWASP password derivation guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) informs the PBKDF2 work factor. A strong password still matters; encrypted carriers permit offline password guessing.

Unencrypted SHA-256 checks detect accidental corruption but do not establish authenticity or secrecy. The formats make no claim of forensic invisibility. JPEG/WebP container data and PDF attachments are inspectable; pixel embedding can also be detected.

Limits: 40 MiB carriers, 8 MiB payloads, 16 million pixels, 16384 pixels per image side, 200 PDF pages and 30000 parsed PDF objects. BMP accepts uncompressed 24/32-bit variants. Animated images and signed/encrypted PDFs are rejected. Length and structure checks prevent advertised paths from trusting arbitrary framing sizes. Browser decoders and pdf-lib remain part of the parser trust boundary; limits are not a sandbox for all parser defects.

Refreshing clears application state. No localStorage, sessionStorage, IndexedDB or persistent operation records are used. Downloaded files remain on the device where the user saves them. The host receives ordinary site/asset requests; browser extensions, compromised devices, modified deployments and browser caching are outside the application's guarantees. Serve over HTTPS, or localhost for development, so Web Crypto is available.

Report suspected defects privately through the repository host's security reporting feature once available. No deployment or private contact details are invented here.

