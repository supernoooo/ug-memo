const R2_PUBLIC_BASE_URL = "https://pub-1aca6d58e52442cd974202e263faa11d.r2.dev";
const BUCKET_BINDING = "MEMORY_MEDIA_BUCKET";
const R2_PREFIX = "images";
const ADMIN_SESSION_MS = 30 * 60 * 1000;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_ORIGINS = new Set([
  "https://ug-memo.pages.dev",
  "https://supernoooo.github.io",
  "http://localhost:8788",
  "http://127.0.0.1:8788",
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://ug-memo.pages.dev",
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function safeFileName(value, fallback = "media") {
  const cleaned = String(value || fallback)
    .trim()
    .replace(/[^\w.\-\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 140) || fallback;
}

function encodeStoragePath(path) {
  return String(path).split("/").map(encodeURIComponent).join("/");
}

function publicUrlForKey(key) {
  return `${R2_PUBLIC_BASE_URL}/${encodeStoragePath(key)}`;
}

function contentTypeFromName(name, fallback = "application/octet-stream") {
  const lower = String(name || "").toLowerCase();
  if (/\.(jpe?g)$/.test(lower)) return "image/jpeg";
  if (/\.png$/.test(lower)) return "image/png";
  if (/\.webp$/.test(lower)) return "image/webp";
  if (/\.gif$/.test(lower)) return "image/gif";
  if (/\.mp4$/.test(lower)) return "video/mp4";
  if (/\.webm$/.test(lower)) return "video/webm";
  if (/\.(mov|qt)$/.test(lower)) return "video/quicktime";
  return fallback;
}

function normalizeR2Key(value) {
  const key = String(value || "").trim().replace(/^\/+/, "");
  if (!key || !key.startsWith(`${R2_PREFIX}/`) || key.includes("..")) return "";
  return key;
}

function keyFromPublicUrl(value) {
  try {
    const parsed = new URL(String(value || ""));
    const base = new URL(R2_PUBLIC_BASE_URL);
    if (parsed.origin !== base.origin) return "";
    return normalizeR2Key(decodeURIComponent(parsed.pathname.replace(/^\/+/, "")));
  } catch {
    return "";
  }
}

function base64UrlFromBytes(bytes) {
  let binary = "";
  new Uint8Array(bytes).forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function stringFromBase64Url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

function getAdminSecret(env) {
  return env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD || env.ADMIN_TOKEN || "";
}

async function signPayload(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64UrlFromBytes(signature);
}

async function verifyAdminToken(token, env) {
  const cleanToken = String(token || "").trim();
  if (!cleanToken) return false;
  if (env.ADMIN_TOKEN && cleanToken === env.ADMIN_TOKEN) return true;
  const secret = getAdminSecret(env);
  const [payload, signature] = cleanToken.split(".");
  if (!secret || !payload || !signature) return false;
  const expected = await signPayload(secret, payload);
  if (signature !== expected) return false;
  try {
    const parsed = JSON.parse(stringFromBase64Url(payload));
    return Number(parsed.exp || 0) > Date.now() && Number(parsed.exp || 0) <= Date.now() + ADMIN_SESSION_MS;
  } catch {
    return false;
  }
}

async function verifyAdmin(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return false;
  const token = authorization.slice("Bearer ".length).trim();
  return verifyAdminToken(token, env);
}

async function handleUpload(request, env) {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse(request, { error: "admin_required" }, 401);
  }

  const bucket = env[BUCKET_BINDING];
  if (!bucket) {
    return jsonResponse(request, { error: "r2_binding_missing" }, 500);
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) {
    return jsonResponse(request, { error: "file_required" }, 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonResponse(request, { error: "file_too_large", maxBytes: MAX_UPLOAD_BYTES }, 413);
  }

  const memoryId = safeFileName(form.get("memoryId"), "memory");
  const fileName = safeFileName(file.name || form.get("fileName"), "media");
  const key = `${R2_PREFIX}/${memoryId}-${Date.now()}-${fileName}`;
  const contentType = file.type || contentTypeFromName(fileName);

  await bucket.put(key, file.stream(), {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: {
      originalName: fileName,
      memoryId,
    },
  });

  return jsonResponse(request, {
    url: publicUrlForKey(key),
    path: key,
  });
}

async function handleDelete(request, env) {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse(request, { error: "admin_required" }, 401);
  }

  const bucket = env[BUCKET_BINDING];
  if (!bucket) {
    return jsonResponse(request, { error: "r2_binding_missing" }, 500);
  }

  const payload = await request.json().catch(() => ({}));
  const candidates = [
    ...(Array.isArray(payload.paths) ? payload.paths : []),
    ...(Array.isArray(payload.urls) ? payload.urls.map(keyFromPublicUrl) : []),
  ];
  const keys = Array.from(new Set(candidates.map(normalizeR2Key).filter(Boolean)));

  for (const key of keys) {
    await bucket.delete(key);
  }

  return jsonResponse(request, {
    deleted: keys.length,
    paths: keys,
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method === "POST") return handleUpload(request, env);
  if (request.method === "DELETE") return handleDelete(request, env);
  return jsonResponse(request, { error: "method_not_allowed" }, 405);
}
