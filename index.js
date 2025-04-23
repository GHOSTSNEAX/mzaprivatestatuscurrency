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

// Health check endpoint
server.get('/health', (req, res) => res.status(200).send('OK'));
server.get('/status', (req, res) => res.sendFile(path.join(__dirname, 'status.html')));

const webServer = server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Enhanced token validation
function validateToken(token) {
  if (!token) {
    console.error('❌ ERROR: No token provided in BOT_TOKEN environment variable');
    return false;
  }
  if (!token.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
    console.error('❌ ERROR: Token format appears invalid');
    return false;
  }
  return true;
}

async function startBot() {
  try {
    if (!validateToken(process.env.BOT_TOKEN)) {
      process.exit(1);
    }

    await bot.login(process.env.BOT_TOKEN);
    console.log(`✅ Logged in as ${bot.user.tag}`);
  } catch (error) {
    console.error('❌ Login failed. Double check:');
    console.error('1. Your token in Render environment variables');
    console.error('2. The token in Discord Developer Portal');
    console.error('3. That all required intents are enabled');
    console.error('Full error:', error.message);
    process.exit(1);
  }
}

// ... rest of your existing code ...

startBot();
