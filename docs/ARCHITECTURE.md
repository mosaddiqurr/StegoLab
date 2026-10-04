# Browser architecture

React and TypeScript provide four pages. Vite builds static HTML, JavaScript, CSS, fonts and the existing logo. Hash routing and relative asset paths support both root hosting and project subpaths; navigation needs no application routes on the host.

frontend/src/lib/payload.ts owns versioned packing, Web Crypto, password derivation and integrity verification. images.ts owns format detection, bounded image parsing, PNG/BMP RGB embedding and JPEG/WebP container storage. pdf.ts uses the bundled pdf-lib dependency to preserve pages and write an embedded file stream. carriers.ts selects the handler, checks capacity and verifies the actual serialized output before returning it to the UI.

Embed: carrier validation → payload sizing → packing → optional encryption → format-specific embedding → save/reopen verification → Blob download.

Extract: carrier validation → framed payload discovery → header/checksum validation → password request when needed → authenticated decryption → inner integrity validation → text display or file download.

All state is transient React state and browser memory. There are no runtime services, databases, network uploads, persistent storage or service workers. The production content policy blocks application connections. pdf-lib is loaded on demand from the same static host. Every font and asset is bundled locally.

The Node static server under e2e/ is a test tool that only serves built files. Node is needed for development/build/test, not by the deployed application.

