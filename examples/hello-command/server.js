import http from "node:http";

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const server = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "routely-hello-command" }));
    return;
  }

  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Routely Hello Command</title>
    <style>
      body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #f7f7f4; color: #171714; }
      main { min-height: 100vh; display: grid; place-items: center; padding: 32px; }
      section { width: min(560px, 100%); border: 1px solid #d8d5cc; border-radius: 8px; background: white; padding: 28px; }
      p { color: #5b5f54; line-height: 1.6; }
      code { background: #efeee8; padding: 2px 6px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>Routely command app is running</h1>
        <p>This app is started by Routely's minimal command driver from <code>examples/hello-command</code>.</p>
        <p>Health check: <code>/health</code></p>
      </section>
    </main>
  </body>
</html>`);
});

server.listen(port, host, () => {
  console.log(`Routely hello-command app running at http://${host}:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
