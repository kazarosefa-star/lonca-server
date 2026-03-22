const { WebSocketServer } = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (req.method === 'POST' && req.url === '/notify') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.type === 'READY') { readySet.add(data.name); broadcastStatus(); }
        if (data.type === 'RESET') { readySet.clear(); broadcastStatus(); }
      } catch(e) {}
      res.writeHead(200); res.end('ok');
    });
    return;
  }
  res.writeHead(200); res.end('Lonca Sunucu Aktif');
});

const wss = new WebSocketServer({ server });
const clients = new Map();
let readySet = new Set();

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const [ws] of clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

function broadcastStatus() {
  const allNames = [...readySet];
  broadcast({
    type: 'STATUS',
    total: clients.size,
    ready: allNames.length,
    readyNames: allNames
  });
}

wss.on('connection', (ws) => {
  clients.set(ws, { ws, name: '?', role: 'unknown' });
  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);
      if (data.type === 'JOIN') { clients.set(ws, { ws, name: data.name, role: data.role }); broadcastStatus(); }
      if (data.type === 'READY') { const c = clients.get(ws); if (c) { readySet.add(c.name); broadcastStatus(); } }
      if (data.type === 'RESET') { readySet.clear(); broadcastStatus(); }
    } catch(e) {}
  });
  ws.on('close', () => { clients.delete(ws); broadcastStatus(); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Sunucu port ' + PORT));
