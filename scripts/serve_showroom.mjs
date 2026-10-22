import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.argv[2] || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};
http
  .createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://127.0.0.1:${port}`);
      const pathname = decodeURIComponent(url.pathname);
      const file = path.resolve(
        root,
        `.${pathname === "/" ? "/index.html" : pathname}`,
      );
      if (
        !file.startsWith(`${root}${path.sep}`) ||
        pathname.split("/").some((part) => part.startsWith(".")) ||
        !types[path.extname(file)]
      ) {
        response.writeHead(404).end("Not found");
        return;
      }
      const bytes = await fs.readFile(file);
      response.writeHead(200, {
        "Content-Type": types[path.extname(file)],
        "Cache-Control": "no-store",
      });
      response.end(request.method === "HEAD" ? undefined : bytes);
    } catch {
      response.writeHead(404).end("Not found");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Bingo local showroom: http://127.0.0.1:${port}`),
  );
