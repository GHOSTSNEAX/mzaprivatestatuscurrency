// Import necessary modules with custom variable names
const DiscordClient = require('discord.js').Client;
const GatewayFlags = require('discord.js').GatewayIntentBits;
const PresenceType = require('discord.js').ActivityType;
const environment = require('dotenv');
const webServer = require('express');
const fs = require('path');

// Configure environment variables
environment.config();

// Initialize Discord client with custom settings
const bot = new DiscordClient({
  connectionSettings: {
    intents: [GatewayFlags.Guilds]
  }
});

// Set up web server with custom routes
const server = webServer();
const serverPort = process.env.PORT || 3000;

server.get('/status', (request, response) => {
  const pageLocation = fs.join(__dirname, 'status.html');
  response.sendFile(pageLocation);
});

server.listen(serverPort, () => {
  console.log('\x1b[36m[WEB INTERFACE]\x1b[0m', `\x1b[32mServer operational: http://localhost:${serverPort}/status \x1b[0m`);
});

// Custom status rotation system
const botPresenceMessages = [
  "🔧 Maintaining MZA systems",
  "🎨 Designing new features",
  "⚙️ Optimizing performance"
];

const presenceStates = ['dnd', 'idle'];
let messageRotationIndex = 0;
let stateRotationIndex = 0;

// Custom authentication handler
async function initializeBotSession() {
  try {
    await bot.login(process.env.BOT_SECRET);
    console.log('\x1b[36m[SESSION START]\x1b[0m', `\x1b[32mAuthenticated as: ${bot.user.username} \x1b[0m`);
    console.log('\x1b[36m[BOT PROFILE]\x1b[0m', `\x1b[35mIdentification: ${bot.user.id} \x1b[0m`);
    console.log('\x1b[36m[NETWORK]\x1b[0m', `\x1b[34mActive in ${bot.guilds.cache.size} communities \x1b[0m`);
  } catch (authError) {
    console.error('\x1b[31m[AUTH FAILURE]\x1b[0m', 'Authentication error:', authError.message);
    process.exit(1);
  }
}

// Enhanced presence updater
function refreshBotPresence() {
  const currentMessage = botPresenceMessages[messageRotationIndex];
  const currentState = presenceStates[stateRotationIndex];
  
  bot.user.setPresence({
    activities: [{ 
      name: currentMessage, 
      type: PresenceType.Custom 
    }],
    status: currentState
  });
  
  console.log('\x1b[33m[PRESENCE UPDATE]\x1b[0m', `New status: ${currentMessage} (${currentState})`);
  
  // Rotate through messages and states
  messageRotationIndex = (messageRotationIndex + 1) % botPresenceMessages.length;
  stateRotationIndex = (stateRotationIndex + 1) % presenceStates.length;
}

// Custom health monitoring
function systemHealthMonitor() {
  setInterval(() => {
    const timestamp = new Date();
    console.log('\x1b[35m[SYSTEM CHECK]\x1b[0m', `Operational status confirmed at ${timestamp.toLocaleTimeString()}`);
  }, 30000);
}

// Event handlers with custom names
bot.once('connectionEstablished', () => {
  console.log('\x1b[36m[NETWORK STATS]\x1b[0m', `\x1b[34mLatency: ${bot.ws.ping}ms \x1b[0m`);
  refreshBotPresence();
  setInterval(refreshBotPresence, 15000);
  systemHealthMonitor();
});

// Start bot session
initializeBotSession();

// Custom error handling
process.on('unhandledRejection', (error) => {
  console.error('\x1b[31m[SYSTEM ERROR]\x1b[0m', 'Unhandled exception:', error);
});