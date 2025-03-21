#!/usr/bin/env node

const path = require('path');
const chalk = require('chalk');
const { startServer } = require('../src/server');

// Get the directory where the command was run
const currentDir = process.cwd();

// Start the server with the current directory as the database location
const PORT = process.env.PORT || 3000;
startServer(currentDir, PORT);

console.log(chalk.green(`
╔═══════════════════════════════════════════╗
║                                           ║
║   ${chalk.bold('Chatroom')} is running!                    ║
║                                           ║
║   ${chalk.cyan('→')} Local:   ${chalk.cyan(`http://localhost:${PORT}`)}     ║
║                                           ║
║   SQLite database created in current dir  ║
║   Press Ctrl+C to stop                    ║
║                                           ║
╚═══════════════════════════════════════════╝
`));