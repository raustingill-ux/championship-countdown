export async function onRequest(context) {
  const { request, env } = context;
  const kv = env.COMPLAINT_COUNTERS;
  const key = "cam";

  function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method === "GET") {
    const current = await kv.get(key);
    const count = current ? Number(current) || 0 : 0;
    return jsonResponse({ count });
  }

  if (request.method === "POST") {
    const current = await kv.get(key);
    let count = current ? Number(current) || 0 : 0;
    count += 1;
    await kv.put(key, String(count));
    return jsonResponse({ count });
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
}
