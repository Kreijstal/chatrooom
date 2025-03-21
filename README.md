# Chatroom

A simple chatroom application with SQLite backend and WebSocket support.

## Features

- Real-time messaging using WebSockets
- Persistent message history using SQLite
- Simple and clean UI
- Easy to install and run

## Installation

```bash
npm install -g chatroom
```

## Usage

Navigate to the directory where you want to store the chatroom database, then run:

```bash
npx chatroom
```

This will:
1. Create a SQLite database in the current directory if it doesn't exist
2. Start a web server on port 3000 (default)
3. Open a WebSocket server for real-time communication

Then open your browser to http://localhost:3000 to use the chatroom.

## Custom Port

You can specify a custom port using the PORT environment variable:

```bash
PORT=8080 npx chatroom
```

## License

MIT
