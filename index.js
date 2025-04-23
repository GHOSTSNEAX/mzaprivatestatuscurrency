const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
require('dotenv').config();
const express = require('express');
const path = require('path');

// Debug environment variables
console.log('Environment Variables:', {
  PORT: process.env.PORT,
  BOT_TOKEN: process.env.BOT_TOKEN ? '***REDACTED***' : 'MISSING'
});

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ]
});

const server = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint (required by Render)
server.get('/health', (req, res) => res.status(200).send('OK'));
server.get('/status', (req, res) => res.sendFile(path.join(__dirname, 'status.html')));

const webServer = server.listen(PORT, () => {
  console.log(`🟢 Server running on port ${PORT}`);
});

// ===== YOUR ORIGINAL STATUS ROTATION CODE =====
const statusMessages = [
  "⛔️ Working in MZA",
  "🎨 Being more creative",
  "🤖 Serving your server"
];
const statusTypes = ['dnd', 'idle'];
let currentStatusIndex = 0;

function updateStatus() {
  const status = statusMessages[currentStatusIndex % statusMessages.length];
  const type = statusTypes[currentStatusIndex % statusTypes.length];
  
  bot.user.setPresence({
    activities: [{
      name: status,
      type: ActivityType.Custom
    }],
    status: type
  });
  
  console.log(`🔄 Status updated to: ${status} (${type})`);
  currentStatusIndex++;
}

// ===== ENHANCED STARTUP SEQUENCE ===== 
async function startBot() {
  try {
    if (!process.env.BOT_TOKEN) {
      console.error('❌ Missing BOT_TOKEN in environment variables');
      process.exit(1);
    }

    await bot.login(process.env.BOT_TOKEN);
    console.log(`✅ Logged in as ${bot.user.tag}`);
    
    // Initialize status rotation
    updateStatus();
    setInterval(updateStatus, 15000); // Rotate every 15 seconds
    
    // Health monitor
    setInterval(() => {
      console.log(`❤️ Bot heartbeat at ${new Date().toLocaleTimeString()}`);
    }, 30000);
    
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    process.exit(1);
  }
}

// Start everything
startBot();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  webServer.close(() => {
    bot.destroy();
    console.log('🔴 Services stopped');
    process.exit(0);
  });
});
