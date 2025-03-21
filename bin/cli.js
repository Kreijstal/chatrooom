#!/usr/bin/env node

const path = require('path');
const chalk = require('chalk');
const { startServer } = require('../src/server');

// Get the directory where the command was run
const currentDir = process.cwd();

// Start the server with the current directory as the database location
const PORT = process.env.PORT || 3000;
console.log('Starting chatroom server on port', PORT);
console.log('Using database directory:', currentDir);

startServer(currentDir, PORT)
  .then(() => {
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
  })
  .catch(err => {
    console.error(chalk.red('Failed to start server:'), err);
    process.exit(1);
  });

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