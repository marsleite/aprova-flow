import WebSocket from 'ws';

async function debugCDP() {
  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const pages = await listRes.json();
  const page = pages.find((p: any) => p.type === 'page');
  if (!page) {
    console.log('No page found');
    return;
  }
  
  console.log('Connecting to WebSocket:', page.webSocketDebuggerUrl);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  
  ws.on('open', () => {
    console.log('WS Open!');
    // Send Page.enable
    ws.send(JSON.stringify({ id: 1, method: 'Page.enable', params: {} }));
  });
  
  ws.on('message', (data) => {
    console.log('WS Message:', data.toString());
    const parsed = JSON.parse(data.toString());
    if (parsed.id === 1) {
      // Once page is enabled, send navigate
      console.log('Sending navigate...');
      ws.send(JSON.stringify({ id: 2, method: 'Page.navigate', params: { url: 'http://localhost:3000/' } }));
    }
    if (parsed.id === 2) {
      console.log('Navigate response received!');
      ws.close();
    }
  });
  
  ws.on('error', (err) => {
    console.error('WS Error:', err);
  });
  
  ws.on('close', () => {
    console.log('WS Closed!');
  });
}

debugCDP();
