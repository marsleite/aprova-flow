// api-src/root.ts
function handler(_req, res) {
  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify({
    service: "aprovamind-api",
    status: "ok",
    message: "Use /health, /ai/text, /ai/pdf e as rotas autenticadas do produto."
  }));
}
export {
  handler as default
};
