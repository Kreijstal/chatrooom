const WebSocket = require('ws');

async function insertMessage(db, chatLocationId, username, content) {
  await db.run("BEGIN TRANSACTION");

  try {
    // Ensure the sequence entry exists
    await db.run(`
      INSERT OR IGNORE INTO message_sequences (chat_location_id, last_number)
      VALUES (?, 0)
    `, [chatLocationId]);

    // Increment the last_number and get it
    const { last_number } = await db.get(`
      UPDATE message_sequences
      SET last_number = last_number + 1
      WHERE chat_location_id = ?
      RETURNING last_number
    `, [chatLocationId]) || { last_number: 1 }; // Fallback if RETURNING isn’t supported

    // If RETURNING isn’t available (older SQLite versions), uncomment this:
    /*
    await db.run(`
      UPDATE message_sequences
      SET last_number = last_number + 1
      WHERE chat_location_id = ?
    `, [chatLocationId]);
    const { last_number } = await db.get(`
      SELECT last_number FROM message_sequences WHERE chat_location_id = ?
    `, [chatLocationId]);
    */

    // Insert the message with the incremented number
    const result = await db.run(`
      INSERT INTO messages (chat_location_id, message_number, username, content)
      VALUES (?, ?, ?, ?)
    `, [chatLocationId, last_number, username, content]);

    await db.run("COMMIT");
    //console.log("What is the result here",result)
    return result.lastID; // Return the inserted message ID
  } catch (error) {
    await db.run("ROLLBACK");
    throw error;
  }
}

async function initWebSocket(server, db) {
  const wss = new WebSocket.Server({ server });
  
  // Store connected clients
  const clients = new Set();

  wss.on('connection', async (ws,req) => {
    
    var path=req.url;
    clients.add({ws,path});
    let username = null;
    let chatLocationResult = await db.get('SELECT id FROM chat_locations WHERE path = ?', path);
  if (!chatLocationResult) {
    chatLocationResult = await db.run('INSERT INTO chat_locations (path) VALUES (?)', path);
    chatLocationResult.id = chatLocationResult.lastID;
  }
  const chatLocationId = chatLocationResult.id;
    // Send last 50 messages to new connection
    //Bug: When disconnected and reconnected again, the latest 50 messages get added again even if they are already loaded... maybe simply write what is the latest id message and client should handle the rest with their own history commands if needed
    console.log(`Fetching message history for path ${path} (chat_location_id: ${chatLocationId})`);
  const messages = await db.all(`
    SELECT * FROM messages 
    WHERE chat_location_id = ? 
    ORDER BY timestamp DESC 
    LIMIT 50
  `, chatLocationId);
  console.log('Fetched', messages.length, 'messages');
  ws.send(JSON.stringify({
    type: 'history',
    messages: messages.reverse(),
    firstId: messages.length > 0 ? messages[0].id : null
  }));
   
  ws.on('message', async (data) => {
    try {
      const ip = req.headers['x-real-ip']||(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || ws._socket.remoteAddress;
      const message = JSON.parse(data);
      console.log(`Message from ${ip} on path ${path}:`, message);

      switch (message.type) {
        case 'join':
          username = message.username.trim();
          if (!username) return;

          // Store or update user in database
          await db.run(`
            INSERT OR REPLACE INTO users (username, last_seen) 
            VALUES (?, CURRENT_TIMESTAMP)
          `, username);

          // Broadcast join message to clients in the same path
          broadcastMessage({
            path,
            type: 'system',
            content: `${username} has joined the chat`,
            timestamp: new Date().toISOString()
          });
          break;

        case 'message':
          if (!username || !message.content.trim()) return;

          // Store message in database with chat_location_id and auto-incremented message_number
          var messageId=await insertMessage(db, chatLocationId, username, message.content);

          const insertedMessage = await db.get(`
            SELECT * FROM messages WHERE id = ?
          `, messageId);
          //console.log(insertedMessage,messageId)
          // Broadcast message to all clients in the same path
          broadcastMessage({
            type: 'message',
            id: insertedMessage.message_number,
            username,
            content: message.content,
            timestamp: new Date().toISOString()
          });
          break;

        case 'history':
          if (!message.id || !message.count) return;

          // Fetch messages older than the given ID for this chat location
          const history = await db.all(`
            SELECT * FROM messages 
            WHERE chat_location_id = ? AND id < ? 
            ORDER BY id DESC 
            LIMIT ?
          `, chatLocationId, message.id, message.count);

          // Send history back to requesting client
          ws.send(JSON.stringify({
            type: 'history',
            messages: history.reverse(),
            firstId: history.length > 0 ? history[0].id : null
          }));
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
    //We should broadcast only on clients on same path!!!
    function broadcastMessage(message) {
      //console.log(`should broadcast ${message,req.url}`)
      const messageString = JSON.stringify(message);
      clients.forEach(({path,ws}) => {
        let client=ws;
        if (path==req.url&&client.readyState === WebSocket.OPEN) {
          client.send(messageString);
        }
      });
    }
  });

  return wss;
}

module.exports = { initWebSocket };