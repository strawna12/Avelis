import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8080;

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  try {
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

    // Security: prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
      console.log(`[WARN] Directory traversal attempt blocked: ${req.url}`);
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // Try the requested file, fall back to index.html for SPA routing
    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.log(`[INFO] File not found: ${filePath} — falling back to index.html`);
        fs.readFile(path.join(__dirname, 'index.html'), (fallbackErr, fallbackData) => {
          if (fallbackErr) {
            console.error(`[ERROR] Could not read index.html: ${fallbackErr.message}`);
            res.writeHead(500);
            res.end('Internal Server Error');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(fallbackData);
        });
      } else {
        const ext = path.extname(filePath);
        const contentType = {
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2'
        }[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      }
    });
  } catch (err) {
    console.error(`[ERROR] Unhandled exception in request handler: ${err.message}`);
    console.error(err.stack);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }
});

server.on('error', (err) => {
  console.error(`[ERROR] Server error: ${err.message}`);
  console.error(err.stack);
});

process.on('uncaughtException', (err) => {
  console.error(`[ERROR] Uncaught exception: ${err.message}`);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error(`[ERROR] Unhandled promise rejection: ${reason}`);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
