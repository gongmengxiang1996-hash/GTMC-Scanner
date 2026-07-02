// SPA fallback — skip API routes
const API_PREFIX = "/api/";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  // Let API routes pass through
  if (url.pathname.startsWith(API_PREFIX)) {
    return context.next();
  }
  // For non-API routes, try next() first
  const response = await context.next();
  if (response.status === 404) {
    // Serve index.html as fallback
    const index = await context.env.ASSETS.fetch(url.origin + "/index.html");
    return new Response(index.body, {
      headers: index.headers,
      status: 200
    });
  }
  return response;
}
