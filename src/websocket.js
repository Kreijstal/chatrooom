const WebSocket = require('ws');

async function initWebSocket(server, db) {
  const wss = new WebSocket.Server({ server });
  
  // Store connected clients
  const clients = new Set();

  wss.on('connection', async (ws) => {
    clients.add(ws);
    let username = null;

    // Send last 50 messages to new connection
    console.log('Fetching message history from database');
    const messages = await db.all('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50');
    console.log('Fetched', messages.length, 'messages');
    ws.send(JSON.stringify({
      type: 'history',
      messages: messages.reverse()
    }));

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        
        switch (message.type) {
          case 'join':
            username = message.username.trim();
            if (!username) return;
            
            // Store or update user in database
            await db.run('INSERT OR REPLACE INTO users (username, last_seen) VALUES (?, CURRENT_TIMESTAMP)', username);
            
            // Broadcast join message
            broadcastMessage({
              type: 'system',
              content: `${username} has joined the chat`,
              timestamp: new Date().toISOString()
            });
            break;
            
          case 'message':
            if (!username || !message.content.trim()) return;
            
            // Store message in database
            const result = await db.run('INSERT INTO messages (username, content) VALUES (?, ?)', username, message.content);
            
            // Broadcast message to all clients
            broadcastMessage({
              type: 'message',
              id: result.lastInsertRowid,
              username,
              content: message.content,
              timestamp: new Date().toISOString()
            });
            break;
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    ws.on('close', async () => {
      if (username) {
        // Update last seen timestamp
        await db.run('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE username = ?', username);
        
        // Broadcast leave message
        broadcastMessage({
          type: 'system',
          content: `${username} has left the chat`,
          timestamp: new Date().toISOString()
        });
      }
      clients.delete(ws);
    });
    
    // Broadcast message to all connected clients
    function broadcastMessage(message) {
      const messageString = JSON.stringify(message);
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageString);
        }
      });
    }
  });

  return wss;
}

module.exports = { initWebSocket };