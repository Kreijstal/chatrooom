const express = require('express');
const http = require('http');
const path = require('path');
const { initWebSocket } = require('./websocket');
const { initDatabase } = require('./db');

async function startServer(dbPath, port) {
  // Initialize Express app
  const app = express();
  const server = http.createServer(app);

  // Initialize database
  const db = await initDatabase(path.join(dbPath, 'chatroom.db'));
  
  // Initialize WebSocket server
  initWebSocket(server, db);

  // Serve static files from the package's public directory
  const publicPath = path.join(__dirname, '../public');
  app.use(express.static(publicPath));

  // Start the server
  console.log('Starting server on port', port);
  server.listen(port, () => {
    console.log('Server started successfully');
  });
  
  return server;
}

module.exports = { startServer };