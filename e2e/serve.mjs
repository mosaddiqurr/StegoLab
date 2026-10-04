// Test-only static file server. No API, transformations, uploads or SPA fallback.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../frontend/dist");
const port = Number(process.env.STEGOLAB_STATIC_PORT ?? 5194);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain" };
export const server = createServer(async (request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405).end(); return; }
  try {
    let pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    // The same build is also exercised at a GitHub Pages-style project subpath.
    if (pathname.startsWith("/StegoLab/")) pathname = pathname.slice(9);
    const target = path.resolve(root, "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname));
    if (!target.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    if (!(await stat(target)).isFile()) { response.writeHead(404).end(); return; }
    const bytes = await readFile(target);
    response.writeHead(200, { "Content-Type": types[path.extname(target)] ?? "application/octet-stream", "Content-Length": bytes.length, "Cache-Control": "no-store" });
    response.end(request.method === "HEAD" ? undefined : bytes);
  } catch { response.writeHead(404).end(); }
}).listen(port, "127.0.0.1");
