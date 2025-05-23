const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

async function initDatabase(dbPath) {
  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Initialize SQLite database
  console.log('Initializing database at:', dbPath);
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  console.log('Database initialized successfully');

  // Create tables if they don't exist
  await db.exec(`
  CREATE TABLE IF NOT EXISTS chat_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_location_id INTEGER NOT NULL,
      message_number INTEGER NOT NULL, -- New column for grouped autoincrement
      username TEXT NOT NULL,
      content TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      forwarded_for TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(chat_location_id) REFERENCES chat_locations(id)
  );
  
  CREATE TABLE IF NOT EXISTS message_sequences (
      chat_location_id INTEGER PRIMARY KEY,
      last_number INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(chat_location_id) REFERENCES chat_locations(id)
  );
  
  CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  `);
  return db;
}

module.exports = { initDatabase };