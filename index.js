const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
require('dotenv').config();
const express = require('express');
const path = require('path');

// Enhanced configuration
const config = {
  prefix: '!',
  startingCoins: 100,
  dailyReward: { min: 100, max: 150 },
  workReward: { min: 50, max: 100 },
  cooldowns: {
    daily: 24 * 60 * 60 * 1000, // 24 hours
    work: 60 * 60 * 1000 // 1 hour
  }
};

// Initialize
const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const server = express();
const PORT = process.env.PORT || 3000;

// Health endpoints
server.get('/health', (req, res) => res.status(200).json({ status: 'healthy', timestamp: new Date() }));
server.get('/status', (req, res) => res.sendFile(path.join(__dirname, 'status.html')));

const webServer = server.listen(PORT, () => {
  console.log(`🟢 Web server running on port ${PORT}`);
});

// ===== Professional Economy Module =====
class EconomySystem {
  constructor() {
    this.users = new Map(); // Using Map for better performance
    this.shop = new Shop();
    this.transactionLog = [];
  }

  getUser(userId) {
    if (!this.users.has(userId)) {
      this.users.set(userId, {
        userId,
        coins: config.startingCoins,
        inventory: [],
        cooldowns: {
          daily: null,
          work: null
        },
        transactions: []
      });
    }
    return this.users.get(userId);
  }

  addCoins(userId, amount, reason = 'unspecified') {
    if (amount <= 0) throw new Error('Amount must be positive');
    const user = this.getUser(userId);
    user.coins += amount;
    
    const transaction = { type: 'credit', amount, reason, timestamp: new Date() };
    user.transactions.push(transaction);
    this.transactionLog.push({ userId, ...transaction });
    
    return user.coins;
  }

  removeCoins(userId, amount, reason = 'unspecified') {
    if (amount <= 0) throw new Error('Amount must be positive');
    const user = this.getUser(userId);
    if (user.coins < amount) return false;
    
    user.coins -= amount;
    
    const transaction = { type: 'debit', amount, reason, timestamp: new Date() };
    user.transactions.push(transaction);
    this.transactionLog.push({ userId, ...transaction });
    
    return true;
  }

  transferCoins(senderId, receiverId, amount) {
    if (this.removeCoins(senderId, amount, `transfer to ${receiverId}`)) {
      this.addCoins(receiverId, amount, `transfer from ${senderId}`);
      return true;
    }
    return false;
  }

  canClaimDaily(userId) {
    const user = this.getUser(userId);
    return !user.cooldowns.daily || Date.now() - user.cooldowns.daily > config.cooldowns.daily;
  }

  claimDaily(userId) {
    if (!this.canClaimDaily(userId)) return false;
    
    const user = this.getUser(userId);
    user.cooldowns.daily = Date.now();
    const reward = this._calculateDailyReward();
    
    this.addCoins(userId, reward, 'daily reward');
    return reward;
  }

  canWork(userId) {
    const user = this.getUser(userId);
    return !user.cooldowns.work || Date.now() - user.cooldowns.work > config.cooldowns.work;
  }

  work(userId) {
    if (!this.canWork(userId)) return false;
    
    const user = this.getUser(userId);
    user.cooldowns.work = Date.now();
    const earnings = this._calculateWorkEarnings();
    
    this.addCoins(userId, earnings, 'work earnings');
    return earnings;
  }

  purchaseItem(userId, itemId) {
    const item = this.shop.getItem(itemId);
    if (!item) throw new Error('Item not found');
    
    const user = this.getUser(userId);
    if (user.coins < item.price) return false;
    
    if (this.removeCoins(userId, item.price, `purchase ${item.name}`)) {
      user.inventory.push(item);
      return true;
    }
    return false;
  }

  getInventory(userId) {
    const user = this.getUser(userId);
    return [...user.inventory]; // Return copy to prevent direct modification
  }

  getLeaderboard(limit = 10) {
    return Array.from(this.users.values())
      .sort((a, b) => b.coins - a.coins)
      .slice(0, limit)
      .map(user => ({ userId: user.userId, coins: user.coins }));
  }

  _calculateDailyReward() {
    return config.dailyReward.min + Math.floor(Math.random() * (config.dailyReward.max - config.dailyReward.min + 1));
  }

  _calculateWorkEarnings() {
    return config.workReward.min + Math.floor(Math.random() * (config.workReward.max - config.workReward.min + 1));
  }
}

class Shop {
  constructor() {
    this.items = [
      { id: 1, name: '🍎 Apple', price: 50, description: 'A tasty apple that does nothing' },
      { id: 2, name: '🛡️ Shield', price: 200, description: 'Protects you from... something' },
      { id: 3, name: '🎩 Hat', price: 150, description: 'Fancy headwear' },
      { id: 4, name: '🔑 Key', price: 300, description: 'Opens... something?' },
      { id: 5, name: '💎 Diamond', price: 1000, description: 'Shiny and valuable' },
      { id: 6, name: '🏆 Trophy', price: 5000, description: 'Prestigious award' },
      { id: 7, name: '📜 Scroll', price: 750, description: 'Ancient knowledge' }
    ];
  }

  getItem(id) {
    return this.items.find(item => item.id === id);
  }

  getItems() {
    return [...this.items]; // Return copy to prevent direct modification
  }

  formatShopEmbed() {
    return {
      title: '🛒 Shop',
      description: this.items.map(item => 
        `**${item.name}** - ${item.price} coins\n` +
        `${item.description}\n` +
        `ID: ${item.id}\n`
      ).join('\n'),
      color: 0x00ff00,
      footer: { text: `Use ${config.prefix}buy <id> to purchase an item` }
    };
  }
}

// Initialize economy
const economy = new EconomySystem();

// ===== Bot Status =====
const statusMessages = [
  { text: "⛔️ Working in MZA", type: 'dnd' },
  { text: "🎨 Being creative", type: 'idle' },
  { text: "🤖 Economy System", type: 'online' }
];
let currentStatusIndex = 0;

function updateStatus() {
  const status = statusMessages[currentStatusIndex % statusMessages.length];
  
  bot.user.setPresence({
    activities: [{
      name: status.text,
      type: ActivityType.Custom
    }],
    status: status.type
  });
  
  console.log(`🔄 Status updated to: ${status.text} (${status.type})`);
  currentStatusIndex++;
}

// ===== Command Handler =====
const commands = {
  balance: {
    description: 'Check your coin balance',
    execute: async (message) => {
      const user = economy.getUser(message.author.id);
      message.reply(`💰 You have ${user.coins} coins.`);
    }
  },
  
  daily: {
    description: 'Claim your daily reward',
    execute: async (message) => {
      if (!economy.canClaimDaily(message.author.id)) {
        return message.reply('⏳ You already claimed your daily reward today!');
      }
      
      const reward = economy.claimDaily(message.author.id);
      message.reply(`🎉 You claimed your daily reward of ${reward} coins!`);
    }
  },
  
  shop: {
    description: 'View available items in the shop',
    execute: async (message) => {
      message.reply({ embeds: [economy.shop.formatShopEmbed()] });
    }
  },
  
  buy: {
    description: 'Purchase an item from the shop',
    usage: '<item_id>',
    execute: async (message, args) => {
      const itemId = parseInt(args[0]);
      if (isNaN(itemId)) {
        return message.reply('❌ Please specify a valid item ID.');
      }
      
      try {
        if (economy.purchaseItem(message.author.id, itemId)) {
          const item = economy.shop.getItem(itemId);
          message.reply(`✅ You bought ${item.name} for ${item.price} coins!`);
        } else {
          message.reply('❌ You don\'t have enough coins for this item.');
        }
      } catch (error) {
        message.reply('❌ That item doesn\'t exist! Check !shop for available items.');
      }
    }
  },
  
  inventory: {
    description: 'View your inventory',
    aliases: ['inv'],
    execute: async (message) => {
      const inventory = economy.getInventory(message.author.id);
      
      if (inventory.length === 0) {
        return message.reply('🎒 Your inventory is empty! Visit the !shop to buy some items.');
      }
      
      const inventoryList = inventory.map(item => item.name).join(', ');
      message.reply(`🎒 Your inventory:\n${inventoryList}`);
    }
  },
  
  work: {
    description: 'Work to earn coins',
    execute: async (message) => {
      if (!economy.canWork(message.author.id)) {
        return message.reply('⏳ You need to rest before working again!');
      }
      
      const earnings = economy.work(message.author.id);
      message.reply(`💼 You worked hard and earned ${earnings} coins!`);
    }
  },
  
  leaderboard: {
    description: 'View the wealthiest users',
    aliases: ['lb'],
    execute: async (message) => {
      const leaderboard = economy.getLeaderboard(10);
      
      if (leaderboard.length === 0) {
        return message.reply('📊 No users on the leaderboard yet.');
      }
      
      const leaderboardText = leaderboard.map((entry, index) => 
        `${index + 1}. <@${entry.userId}> - ${entry.coins} coins`
      ).join('\n');
      
      message.reply({
        embeds: [{
          title: '🏆 Wealth Leaderboard',
          description: leaderboardText,
          color: 0xffd700
        }]
      });
    }
  },
  
  give: {
    description: 'Give coins to another user (Admin only)',
    usage: '@user <amount>',
    adminOnly: true,
    execute: async (message, args) => {
      const target = message.mentions.users.first();
      if (!target) return message.reply('❌ Please mention a user to give coins to.');
      
      const amount = parseInt(args[1]);
      if (isNaN(amount)) return message.reply('❌ Please specify a valid amount.');
      
      if (economy.transferCoins(message.author.id, target.id, amount)) {
        message.reply(`✅ You gave ${target.username} ${amount} coins.`);
      } else {
        message.reply('❌ You don\'t have enough coins for this transfer.');
      }
    }
  }
};

// Message handler
bot.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(config.prefix)) return;
  
  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  
  // Find command or alias
  const command = Object.values(commands).find(cmd => 
    cmd.name === commandName || (cmd.aliases && cmd.aliases.includes(commandName))
  );
  
  if (!command) return;
  
  // Admin check
  if (command.adminOnly && message.author.id !== process.env.ADMIN_ID) {
    return message.reply('❌ You don\'t have permission to use this command.');
  }
  
  try {
    await command.execute(message, args);
  } catch (error) {
    console.error('Command error:', error);
    message.reply('❌ An error occurred while executing this command.');
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
      console.log(`❤️ Bot health check at ${new Date().toLocaleTimeString()}`);
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
    console.log('🔴 Bot and server stopped.');
    process.exit(0);
  });
});