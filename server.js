const { WebSocketServer } = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
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
  const shamans = [...clients.values()].filter(c => c.role === 'shaman').map(c => c.name);
  const readyList = [...readySet].filter(n => shamans.includes(n));
  broadcast({
    type: 'STATUS',
    total: shamans.length,
    ready: readyList.length,
    readyNames: readyList,
    shamanNames: shamans
  });
}

wss.on('connection', (ws) => {
  clients.set(ws, { ws, name: '?', role: 'unknown' });

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);
      if (data.type === 'JOIN') {
        clients.set(ws, { ws, name: data.name, role: data.role });
        broadcastStatus();
      }
      if (data.type === 'READY') {
        const c = clients.get(ws);
        if (c) { readySet.add(c.name); broadcastStatus(); }
      }
      if (data.type === 'RESET') {
        readySet.clear(); broadcastStatus();
      }
    } catch(e) {}
  });

  ws.on('close', () => {
    const c = clients.get(ws);
    if (c) readySet.delete(c.name);
    clients.delete(ws);
    broadcastStatus();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Sunucu port ' + PORT));
