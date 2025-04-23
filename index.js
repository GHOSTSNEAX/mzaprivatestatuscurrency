// Import necessary modules
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
require('dotenv').config();
const express = require('express');
const path = require('path');

// Initialize Discord client with proper intents
const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Set up web server
const server = express();
const serverPort = process.env.PORT || 3000;

server.get('/status', (req, res) => {
  res.sendFile(path.join(__dirname, 'status.html'));
});

server.listen(serverPort, () => {
  console.log('\x1b[36m[WEB SERVER]\x1b[0m', `\x1b[32mRunning on port ${serverPort}\x1b[0m`);
});

// Status rotation configuration
const statusMessages = [
  "🛠️ Maintaining systems",
  "🎨 Designing new features",
  "⚡ Optimizing performance"
];
const statusTypes = ['dnd', 'idle'];
let statusIndex = 0;

// Bot login function
async function startBot() {
  try {
    await bot.login(process.env.BOT_TOKEN);
    console.log('\x1b[36m[LOGIN]\x1b[0m', `\x1b[32mLogged in as ${bot.user.tag}\x1b[0m`);
  } catch (error) {
    console.error('\x1b[31m[ERROR]\x1b[0m', `Login failed: ${error.message}`);
    process.exit(1);
  }
}

// Update bot presence
function updatePresence() {
  const status = statusMessages[statusIndex % statusMessages.length];
  const type = statusTypes[statusIndex % statusTypes.length];
  
  bot.user.setPresence({
    activities: [{
      name: status,
      type: ActivityType.Custom
    }],
    status: type
  });
  
  console.log('\x1b[33m[STATUS]\x1b[0m', `Updated to: ${status}`);
  statusIndex++;
}

// Bot ready event
bot.once('ready', () => {
  console.log('\x1b[36m[READY]\x1b[0m', `\x1b[34mPing: ${bot.ws.ping}ms\x1b[0m`);
  updatePresence();
  setInterval(updatePresence, 15000);
  
  // Health check
  setInterval(() => {
    console.log('\x1b[35m[HEALTH]\x1b[0m', `Bot is running at ${new Date().toLocaleTimeString()}`);
  }, 30000);
});

// Start the bot
startBot();

// Error handling
process.on('unhandledRejection', error => {
  console.error('\x1b[31m[ERROR]\x1b[0m', `Unhandled rejection: ${error.message}`);
});
