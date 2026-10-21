import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), {
    name: "stegolab-production-policy",
    apply: "build",
    transformIndexHtml() { return [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'" }, injectTo: "head" }]; },
  }],
  base: "./",
  // The CSP allows fonts only from 'self', so assets must never be inlined as data: URIs.
  build: { assetsInlineLimit: 0 },
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
});
