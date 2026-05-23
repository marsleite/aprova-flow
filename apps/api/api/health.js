// api-src/health.ts
function handler(_req, res) {
  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify({
    service: "aprovamind-api",
    status: "ok"
  }));
}
export {
  handler as default
};
