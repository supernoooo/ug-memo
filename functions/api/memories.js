const DB_BINDING = "MEMORIES_DB";
let schemaReady = false;
const ADMIN_SESSION_MS = 30 * 60 * 1000;
const D1_BATCH_SIZE = 50;
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
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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

function base64UrlFromBytes(bytes) {
  let binary = "";
  new Uint8Array(bytes).forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlFromString(value) {
  return base64UrlFromBytes(new TextEncoder().encode(value));
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

async function createAdminSessionToken(env, username) {
  const secret = getAdminSecret(env);
  if (!secret) throw new Error("admin_secret_missing");
  const payload = base64UrlFromString(JSON.stringify({
    sub: username || "admin",
    exp: Date.now() + ADMIN_SESSION_MS,
  }));
  const signature = await signPayload(secret, payload);
  return `${payload}.${signature}`;
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
    return Number(parsed.exp || 0) > Date.now();
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

async function loginAdmin(request, env) {
  const payload = await request.json().catch(() => ({}));
  const username = String(payload.username || payload.email || "").trim();
  const password = String(payload.password || "");
  const expectedUsername = String(env.ADMIN_USERNAME || "").trim();
  const expectedPassword = String(env.ADMIN_PASSWORD || env.ADMIN_TOKEN || "");
  if (!expectedPassword) {
    return jsonResponse(request, { error: "admin_password_missing" }, 500);
  }
  if (expectedUsername && username !== expectedUsername) {
    return jsonResponse(request, { error: "admin_required" }, 401);
  }
  if (password !== expectedPassword) {
    return jsonResponse(request, { error: "admin_required" }, 401);
  }
  const accessToken = await createAdminSessionToken(env, username || expectedUsername || "admin");
  return jsonResponse(request, {
    ok: true,
    email: username || expectedUsername || "admin",
    accessToken,
    expiresIn: ADMIN_SESSION_MS / 1000,
  });
}

function parseTags(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function dbRowToApi(row) {
  return {
    id: row.id,
    year: row.year,
    month: row.month,
    title: row.title,
    date: row.date || "",
    place: row.place || "",
    feeling: row.feeling || "",
    tags: parseTags(row.tags),
    image_url: row.image_url,
    image_path: row.image_path || "",
    media_type: row.media_type || "image",
    video_url: row.video_url || "",
    video_path: row.video_path || "",
    source: row.source || "user",
    deleted_at: row.deleted_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function cleanMemory(input) {
  const row = input || {};
  const id = String(row.id || "").trim();
  const title = String(row.title || "").trim();
  const year = String(row.year || "").trim();
  const imageUrl = String(row.image_url || row.image || "").trim();
  if (!id || !title || !year || !imageUrl) {
    throw new Error("id, year, title, and image_url are required");
  }
  const tags = Array.isArray(row.tags) ? row.tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
  return {
    id,
    year,
    month: Number(row.month) || 1,
    title,
    date: String(row.date || ""),
    place: String(row.place || ""),
    feeling: String(row.feeling || ""),
    tags: JSON.stringify(tags),
    image_url: imageUrl,
    image_path: row.image_path ? String(row.image_path) : null,
    media_type: String(row.media_type || "image"),
    video_url: row.video_url ? String(row.video_url) : null,
    video_path: row.video_path ? String(row.video_path) : null,
    source: String(row.source || "user"),
    deleted_at: row.deleted_at ? String(row.deleted_at) : null,
    created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
    updated_at: row.updated_at ? String(row.updated_at) : new Date().toISOString(),
  };
}

function getDb(env) {
  const db = env[DB_BINDING];
  if (!db) throw new Error("d1_binding_missing");
  return db;
}

async function ensureSchema(env) {
  if (schemaReady) return;
  const db = getDb(env);
  await db.batch([
    db.prepare(`
      create table if not exists memories (
        id text primary key,
        year text not null,
        month integer not null,
        title text not null,
        date text,
        place text,
        feeling text,
        tags text not null default '[]',
        image_url text not null,
        image_path text,
        media_type text not null default 'image',
        video_url text,
        video_path text,
        source text not null default 'user',
        deleted_at text,
        created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `),
    db.prepare("create index if not exists memories_created_at_idx on memories(created_at desc)"),
    db.prepare("create index if not exists memories_year_month_idx on memories(year, month)"),
    db.prepare("create index if not exists memories_deleted_at_idx on memories(deleted_at)"),
  ]);
  schemaReady = true;
}

async function listMemories(request, env) {
  await ensureSchema(env);
  const rows = await getDb(env)
    .prepare("select * from memories order by created_at desc, id desc")
    .all();
  return jsonResponse(request, (rows.results || []).map(dbRowToApi));
}

async function upsertMemories(request, env) {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse(request, { error: "admin_required" }, 401);
  }
  await ensureSchema(env);
  const payload = await request.json().catch(() => null);
  if (payload?.action === "verify") {
    return jsonResponse(request, { ok: true });
  }
  const rows = Array.isArray(payload) ? payload : [payload];
  const cleanedRows = rows.map(cleanMemory);
  const statements = cleanedRows.map((row) =>
    getDb(env)
      .prepare(`
        insert into memories (
          id, year, month, title, date, place, feeling, tags, image_url, image_path,
          media_type, video_url, video_path, source, deleted_at, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          year = excluded.year,
          month = excluded.month,
          title = excluded.title,
          date = excluded.date,
          place = excluded.place,
          feeling = excluded.feeling,
          tags = excluded.tags,
          image_url = excluded.image_url,
          image_path = excluded.image_path,
          media_type = excluded.media_type,
          video_url = excluded.video_url,
          video_path = excluded.video_path,
          source = excluded.source,
          deleted_at = excluded.deleted_at,
          updated_at = excluded.updated_at
      `)
      .bind(
        row.id,
        row.year,
        row.month,
        row.title,
        row.date,
        row.place,
        row.feeling,
        row.tags,
        row.image_url,
        row.image_path,
        row.media_type,
        row.video_url,
        row.video_path,
        row.source,
        row.deleted_at,
        row.created_at,
        row.updated_at,
      ),
  );
  const db = getDb(env);
  for (let index = 0; index < statements.length; index += D1_BATCH_SIZE) {
    await db.batch(statements.slice(index, index + D1_BATCH_SIZE));
  }
  return jsonResponse(request, { ok: true, count: cleanedRows.length });
}

async function deleteMemory(request, env) {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse(request, { error: "admin_required" }, 401);
  }
  await ensureSchema(env);
  const url = new URL(request.url);
  const id = String(url.searchParams.get("id") || "").trim();
  if (!id) return jsonResponse(request, { error: "id_required" }, 400);
  await getDb(env).prepare("delete from memories where id = ?").bind(id).run();
  return jsonResponse(request, { ok: true, id });
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  try {
    const url = new URL(request.url);
    if (request.method === "GET" && url.searchParams.get("verify") === "1") {
      return (await verifyAdmin(request, env)) ? jsonResponse(request, { ok: true }) : jsonResponse(request, { error: "admin_required" }, 401);
    }
    if (request.method === "GET") return listMemories(request, env);
    if (request.method === "POST" && url.searchParams.get("login") === "1") return loginAdmin(request, env);
    if (request.method === "POST") return upsertMemories(request, env);
    if (request.method === "DELETE") return deleteMemory(request, env);
    return jsonResponse(request, { error: "method_not_allowed" }, 405);
  } catch (error) {
    return jsonResponse(request, { error: String(error?.message || error || "request_failed") }, 500);
  }
}
