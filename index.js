const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
require('dotenv').config();
const express = require('express');
const path = require('path');

// For render cause im noob
console.log('Environment Variables:', {
  PORT: process.env.PORT,
  BOT_TOKEN: process.env.BOT_TOKEN ? 'Invalid token' : 'MISSING'
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

// health check 
server.get('/health', (req, res) => res.status(200).send('OK'));
server.get('/status', (req, res) => res.sendFile(path.join(__dirname, 'status.html')));

const webServer = server.listen(PORT, () => {
  console.log(`🟢 Server running on port ${PORT}`);
});

// ===== Economy Module =====
const users = {}; // In-memory storage (consider using a database for production)

// Shop items
const shopItems = [
  { id: 1, name: '🍎 Apple', price: 50, description: 'A tasty apple that does nothing' },
  { id: 2, name: '🛡️ Shield', price: 200, description: 'Protects you from... something' },
  { id: 3, name: '🎩 Hat', price: 150, description: 'Fancy headwear' },
  { id: 4, name: '🔑 Key', price: 300, description: 'Opens... something?' },
  { id: 5, name: '💎 Diamond', price: 1000, description: 'Shiny and valuable' }
];

// Initialize user data
function getUserData(userId) {
  if (!users[userId]) {
    users[userId] = {
      coins: 100, // Starting coins
      inventory: [],
      lastDaily: null
    };
  }
  return users[userId];
}

// Add coins to user
function addCoins(userId, amount) {
  const user = getUserData(userId);
  user.coins += amount;
  return user.coins;
}

// Remove coins from user
function removeCoins(userId, amount) {
  const user = getUserData(userId);
  if (user.coins < amount) return false;
  user.coins -= amount;
  return true;
}

// Add item to inventory
function addItem(userId, itemId) {
  const user = getUserData(userId);
  const item = shopItems.find(i => i.id === itemId);
  if (!item) return false;
  
  user.inventory.push(item);
  return true;
}

// Check if user can claim daily reward
function canClaimDaily(userId) {
  const user = getUserData(userId);
  if (!user.lastDaily) return true;
  
  const lastClaim = new Date(user.lastDaily);
  const now = new Date();
  return now.getDate() !== lastClaim.getDate() || 
         now.getMonth() !== lastClaim.getMonth() || 
         now.getFullYear() !== lastClaim.getFullYear();
}

// Claim daily reward
function claimDaily(userId) {
  const user = getUserData(userId);
  user.lastDaily = new Date();
  const reward = 100 + Math.floor(Math.random() * 50); // 100-150 coins
  user.coins += reward;
  return reward;
}

// ===== Bot Status =====
const statusMessages = [
  "⛔️ Working in MZA",
  "🎨 Being more creative",
  "🤖 Serving your server"
];
const statusTypes = ['dnd'];
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

// ===== Bot Commands =====
bot.on('messageCreate', async message => {
  if (message.author.bot) return;
  
  const prefix = '!';
  if (!message.content.startsWith(prefix)) return;
  
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  
  try {
    // Balance command
    if (command === 'balance' || command === 'bal') {
      const user = getUserData(message.author.id);
      message.reply(`💰 You have ${user.coins} coins.`);
    }
    
    // Daily reward command
    else if (command === 'daily') {
      if (!canClaimDaily(message.author.id)) {
        return message.reply('⏳ You already claimed your daily reward today!');
      }
      
      const reward = claimDaily(message.author.id);
      message.reply(`🎉 You claimed your daily reward of ${reward} coins!`);
    }
    
    // Shop command
    else if (command === 'shop') {
      const shopList = shopItems.map(item => 
        `**${item.name}** - ${item.price} coins\n${item.description}\nID: ${item.id}\n`
      ).join('\n');
      
      message.reply({
        embeds: [{
          title: '🛒 Shop',
          description: shopList,
          color: 0x00ff00,
          footer: { text: 'Use !buy <id> to purchase an item' }
        }]
      });
    }
    
    // Buy command
    else if (command === 'buy') {
      const itemId = parseInt(args[0]);
      const item = shopItems.find(i => i.id === itemId);
      
      if (!item) {
        return message.reply('❌ That item doesn\'t exist! Check !shop for available items.');
      }
      
      const user = getUserData(message.author.id);
      if (user.coins < item.price) {
        return message.reply(`❌ You don't have enough coins! You need ${item.price} but only have ${user.coins}.`);
      }
      
      removeCoins(message.author.id, item.price);
      addItem(message.author.id, itemId);
      
      message.reply(`✅ You bought ${item.name} for ${item.price} coins!`);
    }
    
    // Inventory command
    else if (command === 'inventory' || command === 'inv') {
      const user = getUserData(message.author.id);
      
      if (user.inventory.length === 0) {
        return message.reply('🎒 Your inventory is empty! Visit the !shop to buy some items.');
      }
      
      const inventoryList = user.inventory.map(item => item.name).join(', ');
      message.reply(`🎒 Your inventory:\n${inventoryList}`);
    }
    
    // Work command
    else if (command === 'work') {
      const earnings = 50 + Math.floor(Math.random() * 50); // 50-100 coins
      addCoins(message.author.id, earnings);
      message.reply(`💼 You worked hard and earned ${earnings} coins!`);
    }
    
    // Give command (admin)
    else if (command === 'give' && message.author.id === 'YOUR_USER_ID_HERE') {
      const target = message.mentions.users.first();
      if (!target) return message.reply('❌ Please mention a user to give coins to.');
      
      const amount = parseInt(args[1]);
      if (isNaN(amount)) return message.reply('❌ Please specify a valid amount.');
      
      addCoins(target.id, amount);
      message.reply(`✅ You gave ${target.username} ${amount} coins.`);
    }
    
  } catch (error) {
    console.error('Command error:', error);
    message.reply('❌ An error occurred while processing your command.');
  }
});

// ===== Bot Startup =====
async function startBot() {
  try {
    if (!process.env.BOT_TOKEN) {
      console.error('❌ Missing BOT_TOKEN in environment variables');
      process.exit(1);
    }

    await bot.login(process.env.BOT_TOKEN);
    console.log(`✅ Logged in as ${bot.user.tag}`);
    
    updateStatus();
    setInterval(updateStatus, 20000); // Rotate every 20 seconds
    
    // Health monitor
    setInterval(() => {
      console.log(`❤️ Bot is alive somehow lmao ${new Date().toLocaleTimeString()}`);
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
  console.log('🛑 Shutting down cause not needed anymore sed..');
  webServer.close(() => {
    bot.destroy();
    console.log('🔴 Stopped.');
    process.exit(0);
  });
});