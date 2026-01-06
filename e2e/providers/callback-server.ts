import { createServer } from 'http';

/**
 * Simple callback server for E2E provider tests.
 * Accepts OAuth callbacks and responds with a simple HTML page.
 * The browser can then be inspected for the callback URL parameters.
 */
const port = 3000;

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head><title>OAuth Callback</title></head>
      <body>
        <h1>Callback Received</h1>
        <p>URL: ${req.url}</p>
      </body>
    </html>
  `);
});

server.listen(port, () => {
  console.log(`Callback server running on http://localhost:${port}`);
});
