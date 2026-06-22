// ============================================================
//  CO-OP LAN SERVER  (zero-dependency)
//  -----------
//  Run this on ONE computer (the host's). It does two jobs:
//
//    1. Serves the game files over http, so everyone on the same Wi-Fi
//       can open the game in their browser at  http://<host-ip>:8080
//
//    2. Acts as a tiny message relay for the co-op lobby. It does NOT
//       understand the lobby — it just forwards every message it receives
//       to everyone else who's polling. js/coop.js holds all the actual
//       host / pair / accept logic; this server is a dumb post office.
//
//  No npm install, no dependencies — only Node's built-in modules.
//
//  USAGE:   node server.js            (defaults to port 8080)
//           PORT=3000 node server.js  (or pick your own port)
// ============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;                       // serve this folder (where Game.html lives)
const INDEX = 'Game.html';

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
    '.map': 'application/json; charset=utf-8'
};

// ---- Relay state ----------------------------------------------------------
//  A ring buffer of recent messages. Each gets a monotonically increasing
//  seq. Clients poll for messages newer than the last seq they've seen.
const buffer = [];          // [{seq, msg}]
let head = 0;               // last assigned seq
const MAX_BUFFER = 500;     // keep memory bounded
const MAX_AGE_MS = 30000;   // drop messages older than this

function pushMessage(msg) {
    head++;
    buffer.push({ seq: head, msg, t: Date.now() });
    // Prune by count and age so a long-running server doesn't grow forever.
    const cutoff = Date.now() - MAX_AGE_MS;
    while (buffer.length > MAX_BUFFER || (buffer.length && buffer[0].t < cutoff)) buffer.shift();
    return head;
}
function messagesSince(since) {
    return buffer.filter(e => e.seq > since).map(e => e.msg);
}

// ---- HTTP server ----------------------------------------------------------
const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);

    // --- Co-op relay API ---
    if (pathname === '/coop/poll' && req.method === 'GET') {
        // No `since` param → just hand back the current head so a fresh client
        // syncs to "now" instead of replaying old chatter.
        const hasSince = url.searchParams.has('since');
        const since = hasSince ? parseInt(url.searchParams.get('since'), 10) || 0 : head;
        const msgs = hasSince ? messagesSince(since) : [];
        return sendJSON(res, 200, { seq: head, msgs });
    }
    if (pathname === '/coop/send' && req.method === 'POST') {
        let body = '';
        let tooBig = false;
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 64 * 1024) { tooBig = true; req.destroy(); }   // guard against junk
        });
        req.on('end', () => {
            if (tooBig) return sendJSON(res, 413, { error: 'too large' });
            try {
                const msg = JSON.parse(body);
                const seq = pushMessage(msg);
                sendJSON(res, 200, { seq });
            } catch (e) {
                sendJSON(res, 400, { error: 'bad json' });
            }
        });
        return;
    }

    // --- Static file serving (the game itself) ---
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405); return res.end('Method Not Allowed');
    }
    let rel = pathname === '/' ? INDEX : pathname.replace(/^\/+/, '');
    const filePath = path.join(ROOT, rel);
    // Path-traversal guard: resolved file must stay inside ROOT.
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }

    fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) { res.writeHead(404); return res.end('Not Found'); }
        const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
        if (req.method === 'HEAD') return res.end();
        fs.createReadStream(filePath).pipe(res);
    });
});

function sendJSON(res, code, obj) {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
}

// ---- Start + print the addresses to share ---------------------------------
server.listen(PORT, () => {
    const ips = [];
    const nics = os.networkInterfaces();
    for (const name in nics) for (const ni of nics[name]) {
        if (ni.family === 'IPv4' && !ni.internal) ips.push(ni.address);
    }
    console.log('');
    console.log('  ===== ASTEROIDS REMASTERED — CO-OP SERVER =====');
    console.log('  Running. Leave this window open while you play.');
    console.log('');
    console.log('  On THIS computer, open:   http://localhost:' + PORT);
    if (ips.length) {
        console.log('');
        console.log('  On OTHER devices on the same Wi-Fi, open:');
        for (const ip of ips) console.log('      http://' + ip + ':' + PORT);
    }
    console.log('');
    console.log('  (If a Windows Firewall popup appears, choose "Allow'
        + ' access" on Private networks.)');
    console.log('  Press Ctrl+C here to stop the server.');
    console.log('');
});
