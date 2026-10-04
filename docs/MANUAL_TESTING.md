# Quick manual test

1. Run npm ci --prefix frontend and npm run dev --prefix frontend. Open the displayed URL.
2. Choose Embed, select an image, enter a short message and embed it.
3. Download the generated carrier.
4. Open Extract, upload that download and compare the exact message.
5. Repeat with Protect with password enabled.
6. Try a wrong password: recovery must fail without showing any content. Retry with the correct one.
7. Embed a small binary file, recover it and compare its SHA-256 hash.
8. Repeat with a PDF and with PNG, JPEG, BMP and WebP images.
9. Check Home, Embed, Extract and About at desktop, tablet and mobile sizes.
10. Run npm run build --prefix frontend and npm run preview --prefix frontend. Repeat the main flows against this static build. Refresh /#/embed and /#/extract. No application service is needed.

