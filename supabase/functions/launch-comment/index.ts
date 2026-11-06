import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://monarchaurex.co.za",
]);

const responseHeaders = (origin: string) => {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "apikey, content-type",
  });

  if (allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
};

const respond = (
  body: Record<string, unknown>,
  status: number,
  origin: string,
) => {
  const headers = responseHeaders(origin);
  return new Response(JSON.stringify(body), { status, headers });
};

const cleanString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const createHmacFingerprint = async (
  secret: string,
  value: string,
) => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value),
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? "";

  if (!allowedOrigins.has(origin)) {
    return respond({ error: "This origin is not allowed." }, 403, origin);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: responseHeaders(origin),
    });
  }

  if (request.method !== "POST") {
    return respond({ error: "Method not allowed." }, 405, origin);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 4096) {
    return respond({ error: "The comment is too large." }, 413, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const rateLimitSecret = Deno.env.get("SITE_FORM_RATE_LIMIT_HMAC_KEY");

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !rateLimitSecret ||
    rateLimitSecret.length < 32
  ) {
    console.error("Launch comment service is missing server-side configuration.");
    return respond(
      { error: "The comment service is not configured." },
      503,
      origin,
    );
  }

  let body: Record<string, unknown>;

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 4096) {
      return respond({ error: "The comment is too large." }, 413, origin);
    }

    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return respond({ error: "Invalid comment submission." }, 400, origin);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return respond({ error: "Invalid comment submission." }, 400, origin);
  }

  if (cleanString(body.website)) {
    return respond({ ok: true }, 202, origin);
  }

  const displayName = cleanString(body.name);
  const comment = cleanString(body.message);
  const termsAgreed = body.termsAgreed === true;
  const startedAt = Number(body.startedAt);
  const elapsed = Date.now() - startedAt;

  if (
    displayName.length < 2 ||
    displayName.length > 60 ||
    comment.length < 5 ||
    comment.length > 1000 ||
    !termsAgreed ||
    !Number.isFinite(startedAt) ||
    elapsed < 3000 ||
    elapsed > 24 * 60 * 60 * 1000
  ) {
    return respond(
      { error: "Please check your name, comment and consent." },
      400,
      origin,
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",").map((part) => part.trim()).at(-1);
  if (!ipAddress || !/^[0-9a-fA-F:.]{3,45}$/.test(ipAddress)) {
    return respond({ error: "The request could not be validated." }, 400, origin);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rateLimitFingerprint = await createHmacFingerprint(
    rateLimitSecret,
    `rate|${ipAddress}`,
  );

  const { data: withinLimit, error: rateLimitError } = await supabase.rpc(
    "consume_launch_comment_rate_limit",
    {
      p_fingerprint_hash: rateLimitFingerprint,
      p_limit: 5,
      p_window_seconds: 900,
    },
  );

  if (rateLimitError) {
    console.error("Launch comment rate-limit check failed:", rateLimitError.code);
    return respond(
      { error: "The comment service is temporarily unavailable." },
      503,
      origin,
    );
  }

  if (!withinLimit) {
    return respond(
      { error: "Please wait before submitting another comment." },
      429,
      origin,
    );
  }

  const dayBucket = new Date().toISOString().slice(0, 10);
  const duplicateFingerprint = await createHmacFingerprint(
    rateLimitSecret,
    `duplicate|${ipAddress}|${displayName.toLocaleLowerCase()}|${comment.toLocaleLowerCase()}|${dayBucket}`,
  );

  const { error: insertError } = await supabase
    .from("launch_comments")
    .insert({
      display_name: displayName,
      comment,
      duplicate_fingerprint: duplicateFingerprint,
    });

  if (insertError?.code === "23505") {
    return respond({ ok: true, duplicate: true }, 201, origin);
  }

  if (insertError) {
    console.error("Launch comment save failed:", insertError.code);
    return respond(
      { error: "Your comment could not be saved." },
      500,
      origin,
    );
  }

  return respond({ ok: true, moderationStatus: "pending" }, 201, origin);
});
