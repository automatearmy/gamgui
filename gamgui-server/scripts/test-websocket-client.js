#!/usr/bin/env node
/**
 * WebSocket Client Test Script
 * 
 * This script tests the WebSocket connection to a GAM session.
 * It connects to the WebSocket server and sends commands.
 */

const WebSocket = require('ws');
const readline = require('readline');
const { program } = require('commander');

// Define command line options
program
  .name('test-websocket-client')
  .description('Test WebSocket connection to a GAM session')
  .version('1.0.0')
  .option('-s, --server <url>', 'WebSocket server URL', 'ws://localhost:8080')
  .option('-i, --session-id <id>', 'Session ID', 'default')
  .option('-p, --path <path>', 'WebSocket path template', '/ws/session/{{SESSION_ID}}/')
  .option('-v, --verbose', 'Verbose output', false)
  .parse(process.argv);

const options = program.opts();

// Create the WebSocket URL
const wsPath = options.path.replace('{{SESSION_ID}}', options.sessionId);
const wsUrl = options.server + wsPath;

console.log(`Connecting to WebSocket server: ${wsUrl}`);

// Create a WebSocket connection
const ws = new WebSocket(wsUrl);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'GAM> '
});

// Handle WebSocket events
ws.on('open', () => {
  console.log('Connected to WebSocket server');
  console.log('Type GAM commands and press Enter to send them');
  console.log('Type "exit" to quit');
  rl.prompt();
});

ws.on('message', (data) => {
  console.log(`\nReceived: ${data}`);
  rl.prompt();
});

ws.on('error', (error) => {
  console.error(`WebSocket error: ${error.message}`);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log(`WebSocket connection closed: ${code} ${reason}`);
  process.exit(0);
});

// Handle user input
rl.on('line', (line) => {
  const command = line.trim();
  
  if (command === 'exit') {
    console.log('Closing WebSocket connection...');
    ws.close();
    rl.close();
    return;
  }
  
  if (options.verbose) {
    console.log(`Sending: ${command}`);
  }
  
  ws.send(command);
}).on('close', () => {
  console.log('Exiting...');
  process.exit(0);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nClosing WebSocket connection...');
  ws.close();
  rl.close();
});
