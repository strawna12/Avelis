import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8080;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CONTACT_EMAIL = process.env.CONTACT_EMAIL;

// Collect the full request body as a string
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// Send a JSON response
function sendJSON(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

async function handleContact(req, res) {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return sendJSON(res, 500, { error: 'Email service is not configured.' });
  }
  if (!CONTACT_EMAIL) {
    console.error('CONTACT_EMAIL is not set');
    return sendJSON(res, 500, { error: 'Recipient email is not configured.' });
  }

  let body;
  try {
    const raw = await readBody(req);
    body = JSON.parse(raw);
  } catch {
    return sendJSON(res, 400, { error: 'Invalid request body.' });
  }

  const { name, email, phone, message } = body;

  if (!name || !email || !message) {
    return sendJSON(res, 400, { error: 'Name, email, and message are required.' });
  }

  const resend = new Resend(RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: 'Avelis Contact Form <onboarding@resend.dev>',
      to: CONTACT_EMAIL,
      reply_to: email,
      subject: 'New Contact Form Submission from Avelis',
      html: `
        <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#2c2c2c;">
          <div style="border-bottom:2px solid #c9a96e;padding-bottom:20px;margin-bottom:28px;">
            <h1 style="font-size:22px;font-weight:400;letter-spacing:0.04em;margin:0;">
              New Consultation Request
            </h1>
            <p style="font-size:13px;color:#888;margin:6px 0 0;">Submitted via the Avelis website contact form</p>
          </div>

          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f0ece4;width:120px;">
                <span style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#888;">Name</span>
              </td>
              <td style="padding:10px 0;border-bottom:1px solid #f0ece4;">
                <strong style="font-size:15px;">${name}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f0ece4;">
                <span style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#888;">Email</span>
              </td>
              <td style="padding:10px 0;border-bottom:1px solid #f0ece4;">
                <a href="mailto:${email}" style="color:#c9a96e;text-decoration:none;">${email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f0ece4;">
                <span style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#888;">Phone</span>
              </td>
              <td style="padding:10px 0;border-bottom:1px solid #f0ece4;">
                ${phone || '<span style="color:#aaa;">Not provided</span>'}
              </td>
            </tr>
          </table>

          <div style="margin-top:28px;">
            <p style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#888;margin-bottom:10px;">Message</p>
            <div style="background:#f9f7f4;border-left:3px solid #c9a96e;padding:18px 20px;font-size:15px;line-height:1.7;white-space:pre-wrap;">${message}</div>
          </div>

          <div style="margin-top:36px;padding-top:20px;border-top:1px solid #f0ece4;font-size:12px;color:#aaa;">
            Reply directly to this email to respond to ${name}.
          </div>
        </div>
      `,
    });

    return sendJSON(res, 200, { success: true });
  } catch (err) {
    console.error('Resend error:', err);
    return sendJSON(res, 500, { error: 'Failed to send email. Please try again.' });
  }
}

const server = http.createServer(async (req, res) => {
  // Handle contact form API endpoint
  if (req.method === 'POST' && req.url === '/api/contact') {
    return handleContact(req, res);
  }

  // Strip query strings for static file serving
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Try the requested file, fall back to index.html for SPA routing
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
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
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
