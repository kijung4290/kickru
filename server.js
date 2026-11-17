const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const ROOT = __dirname;
const SAVES_DIR = path.join(ROOT, "saves");
const DEFAULT_PORT = Number(process.env.PORT) || 3300;
const VERSION_ID = "1794635099051";

fs.mkdirSync(SAVES_DIR, { recursive: true });

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

const CACHEABLE_PREFIXES = [
  "/_next/static/",
  "/competition-logos/",
  "/club-logos/",
  "/logos-dark/",
  "/journey/",
  "/avatars/",
  "/press/",
  "/media-logos/",
  "/turning-points/",
  "/celebrations/",
  "/trophies/",
  "/shop/",
  "/school-logos/",
];

function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

function safeResolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const resolved = path.resolve(ROOT, clean);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    return null;
  }
  return resolved;
}

function sanitizeSaveFilename(rawName) {
  let name = String(rawName || "save")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\.\.+/g, ".");
  if (!name || name === "." || name === ".json") {
    name = "save_" + Date.now();
  }
  if (!name.toLowerCase().endsWith(".json")) {
    name += ".json";
  }
  const base = path.basename(name);
  const fullPath = path.resolve(SAVES_DIR, base);
  if (!fullPath.startsWith(SAVES_DIR + path.sep)) {
    return null;
  }
  return { filename: base, fullPath };
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function readJsonBody(req, maxBytes = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function listLocalSaves() {
  fs.mkdirSync(SAVES_DIR, { recursive: true });
  const entries = fs.readdirSync(SAVES_DIR, { withFileTypes: true });
  const files = [];
  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.toLowerCase().endsWith(".json")) continue;
    const fullPath = path.join(SAVES_DIR, ent.name);
    try {
      const stat = fs.statSync(fullPath);
      const raw = fs.readFileSync(fullPath, "utf8");
      const obj = JSON.parse(raw);
      files.push({
        filename: ent.name,
        kind: obj.kind || "player",
        title: obj.title || ent.name.replace(/\.json$/i, ""),
        subtitle: obj.subtitle || "",
        year: obj.year || 2026,
        ovr: obj.ovr || 0,
        isAuto: !!obj.isAuto || ent.name.startsWith("autosave_"),
        savedAt: obj.savedAt || stat.mtime.toISOString(),
        size: stat.size,
      });
    } catch {
      // Skip unreadable or non-JSON save files
    }
  }
  files.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  return files;
}

function fetchUpstream(remoteUrl, redirects = 3) {
  return new Promise((resolve, reject) => {
    https
      .get(
        remoteUrl,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Referer: "https://kickru.com/",
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
            const nextUrl = new URL(res.headers.location, remoteUrl).toString();
            res.resume();
            resolve(fetchUpstream(nextUrl, redirects - 1));
            return;
          }
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            resolve({
              status: res.statusCode || 500,
              headers: res.headers,
              body: Buffer.concat(chunks),
            });
          });
        }
      )
      .on("error", reject);
  });
}

function isCacheablePath(pathname) {
  return CACHEABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || pathname === "/social-preview.png";
}

const inflight = new Map();

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || "/", "http://localhost");
    const pathname = reqUrl.pathname;
    const method = (req.method || "GET").toUpperCase();

    // Local Folder Save/Load API (/api/local-saves*)
    if (pathname === "/api/local-saves" && method === "GET") {
      return sendJson(res, 200, {
        ok: true,
        folderPath: SAVES_DIR,
        files: listLocalSaves(),
      });
    }

    if (pathname === "/api/local-saves" && method === "POST") {
      const body = await readJsonBody(req);
      const target = sanitizeSaveFilename(body.filename || `save_${Date.now()}.json`);
      if (!target) {
        return sendJson(res, 400, { ok: false, error: "Invalid filename" });
      }
      if (!body.data) {
        return sendJson(res, 400, { ok: false, error: "Missing save data" });
      }
      const payload = {
        format: "kickru-local-save-v1",
        kind: body.kind || "player",
        title: String(body.title || target.filename),
        subtitle: String(body.subtitle || ""),
        year: Number(body.year) || 2026,
        ovr: Number(body.ovr) || 0,
        isAuto: !!body.isAuto,
        savedAt: new Date().toISOString(),
        data: body.data,
      };
      fs.mkdirSync(SAVES_DIR, { recursive: true });
      fs.writeFileSync(target.fullPath, JSON.stringify(payload, null, 2), "utf8");
      return sendJson(res, 200, {
        ok: true,
        filename: target.filename,
        fullPath: target.fullPath,
        savedAt: payload.savedAt,
      });
    }

    if (pathname === "/api/local-saves/file" && method === "GET") {
      const target = sanitizeSaveFilename(reqUrl.searchParams.get("name"));
      if (!target || !fs.existsSync(target.fullPath)) {
        return sendJson(res, 404, { ok: false, error: "Save file not found" });
      }
      const save = JSON.parse(fs.readFileSync(target.fullPath, "utf8"));
      return sendJson(res, 200, { ok: true, filename: target.filename, save });
    }

    if (pathname === "/api/local-saves/file" && method === "DELETE") {
      const target = sanitizeSaveFilename(reqUrl.searchParams.get("name"));
      if (!target || !fs.existsSync(target.fullPath)) {
        return sendJson(res, 404, { ok: false, error: "Save file not found" });
      }
      fs.unlinkSync(target.fullPath);
      return sendJson(res, 200, { ok: true, filename: target.filename });
    }

    if (pathname === "/api/local-saves/open-folder" && method === "POST") {
      fs.mkdirSync(SAVES_DIR, { recursive: true });
      if (process.platform === "win32") {
        execFile("explorer.exe", [SAVES_DIR], () => {});
      } else if (process.platform === "darwin") {
        execFile("open", [SAVES_DIR], () => {});
      } else {
        execFile("xdg-open", [SAVES_DIR], () => {});
      }
      return sendJson(res, 200, { ok: true, folderPath: SAVES_DIR });
    }

    // Block outbound mutations (rankings, survey, feedback)
    if (method === "POST" && pathname.startsWith("/api/")) {
      return sendJson(res, 200, { ok: true, localOnly: true });
    }

    if (pathname === "/version.json") {
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify({ id: VERSION_ID }));
      return;
    }

    if (pathname === "/" || pathname === "/index.html") {
      const htmlPath = path.join(ROOT, "index.html");
      const content = fs.readFileSync(htmlPath);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      res.end(content);
      return;
    }

    // Proxy GET /api/rankings safely
    if (method === "GET" && pathname.startsWith("/api/")) {
      try {
        const upstream = await fetchUpstream("https://kickru.com" + reqUrl.pathname + reqUrl.search);
        res.writeHead(upstream.status, {
          "Content-Type": upstream.headers["content-type"] || "application/json; charset=utf-8",
        });
        res.end(upstream.body);
      } catch {
        sendJson(res, 200, { entries: [], edition: "ko" });
      }
      return;
    }

    const localPath = safeResolve(pathname);
    if (!localPath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
      const data = fs.readFileSync(localPath);
      res.writeHead(200, {
        "Content-Type": getMime(localPath),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });
      res.end(data);
      return;
    }

    if (method === "GET" && isCacheablePath(pathname)) {
      const remoteUrl = "https://kickru.com" + reqUrl.pathname + reqUrl.search;
      let promise = inflight.get(localPath);
      if (!promise) {
        promise = fetchUpstream(remoteUrl)
          .then((upstream) => {
            if (upstream.status === 200 && upstream.body.length > 0) {
              fs.mkdirSync(path.dirname(localPath), { recursive: true });
              fs.writeFileSync(localPath, upstream.body);
            }
            return upstream;
          })
          .finally(() => {
            inflight.delete(localPath);
          });
        inflight.set(localPath, promise);
      }
      const upstream = await promise;
      if (upstream.status === 200) {
        res.writeHead(200, {
          "Content-Type": upstream.headers["content-type"] || getMime(localPath),
          "Cache-Control": "public, max-age=86400",
        });
        res.end(upstream.body);
        return;
      }
      res.writeHead(upstream.status);
      res.end(upstream.body);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error: " + (err?.message || String(err)));
  }
});

function startServer(port = DEFAULT_PORT) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      if (err.code === "EADDRINUSE" && port !== 0) {
        console.log(`Port ${port} is already in use, trying random port...`);
        startServer(0).then(resolve, reject);
      } else {
        reject(err);
      }
    };
    server.once("error", onError);
    server.listen(port, "127.0.0.1", () => {
      server.removeListener("error", onError);
      const addr = server.address();
      console.log(`Kickru clone server listening at http://localhost:${addr.port}`);
      resolve({ server, port: addr.port, savesDir: SAVES_DIR });
    });
  });
}

if (require.main === module) {
  startServer(DEFAULT_PORT).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { startServer, server, SAVES_DIR };
