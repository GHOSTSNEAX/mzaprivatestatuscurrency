const { Client, GatewayIntentBits, ActivityType, REST, Routes } = require('discord.js');
require('dotenv').config();
const express = require('express');
const path = require('path');

// Enhanced configuration
const config = {
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
      footer: { text: 'Use /buy to purchase an item' }
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

// ===== Slash Command Setup =====
const slashCommands = [
  {
    name: 'balance',
    description: 'Check your coin balance'
  },
  {
    name: 'daily',
    description: 'Claim your daily reward'
  },
  {
    name: 'work',
    description: 'Work to earn coins'
  },
  {
    name: 'shop',
    description: 'View available items in the shop'
  },
  {
    name: 'buy',
    description: 'Purchase an item from the shop',
    options: [
      {
        name: 'item_id',
        description: 'The ID of the item you want to buy',
        type: 4, // INTEGER
        required: true
      }
    ]
  },
  {
    name: 'inventory',
    description: 'View your inventory'
  },
  {
    name: 'leaderboard',
    description: 'View the wealthiest users'
  },
  {
    name: 'give',
    description: 'Give coins to another user (Admin only)',
    options: [
      {
        name: 'user',
        description: 'The user to give coins to',
        type: 6, // USER
        required: true
      },
      {
        name: 'amount',
        description: 'The amount of coins to give',
        type: 4, // INTEGER
        required: true
      }
    ]
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

async function registerSlashCommands() {
  try {
    console.log('🔧 Registering slash commands...');
    
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: slashCommands }
    );
    
    console.log('✅ Successfully registered slash commands');
  } catch (error) {
    console.error('❌ Failed to register slash commands:', error);
  }
}

// ===== Slash Command Handlers =====
bot.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options, user } = interaction;

  try {
    // Balance command
    if (commandName === 'balance') {
      const userData = economy.getUser(user.id);
      await interaction.reply(`💰 You have ${userData.coins} coins.`);
    }
    
    // Daily reward command
    else if (commandName === 'daily') {
      if (!economy.canClaimDaily(user.id)) {
        return interaction.reply({ content: '⏳ You already claimed your daily reward today!', ephemeral: true });
      }
      
      const reward = economy.claimDaily(user.id);
      await interaction.reply(`🎉 You claimed your daily reward of ${reward} coins!`);
    }
    
    // Shop command
    else if (commandName === 'shop') {
      await interaction.reply({ embeds: [economy.shop.formatShopEmbed()] });
    }
    
    // Buy command
    else if (commandName === 'buy') {
      const itemId = options.getInteger('item_id');
      
      try {
        if (economy.purchaseItem(user.id, itemId)) {
          const item = economy.shop.getItem(itemId);
          await interaction.reply(`✅ You bought ${item.name} for ${item.price} coins!`);
        } else {
          await interaction.reply({ content: '❌ You don\'t have enough coins for this item.', ephemeral: true });
        }
      } catch (error) {
        await interaction.reply({ content: '❌ That item doesn\'t exist! Check /shop for available items.', ephemeral: true });
      }
    }
    
    // Inventory command
    else if (commandName === 'inventory') {
      const inventory = economy.getInventory(user.id);
      
      if (inventory.length === 0) {
        return interaction.reply({ content: '🎒 Your inventory is empty! Visit the /shop to buy some items.', ephemeral: true });
      }
      
      const inventoryList = inventory.map(item => item.name).join(', ');
      await interaction.reply(`🎒 Your inventory:\n${inventoryList}`);
    }
    
    // Work command
    else if (commandName === 'work') {
      if (!economy.canWork(user.id)) {
        return interaction.reply({ content: '⏳ You need to rest before working again!', ephemeral: true });
      }
      
      const earnings = economy.work(user.id);
      await interaction.reply(`💼 You worked hard and earned ${earnings} coins!`);
    }
    
    // Leaderboard command
    else if (commandName === 'leaderboard') {
      const leaderboard = economy.getLeaderboard(10);
      
      if (leaderboard.length === 0) {
        return interaction.reply({ content: '📊 No users on the leaderboard yet.', ephemeral: true });
      }
      
      const leaderboardText = leaderboard.map((entry, index) => 
        `${index + 1}. <@${entry.userId}> - ${entry.coins} coins`
      ).join('\n');
      
      await interaction.reply({
        embeds: [{
          title: '🏆 Wealth Leaderboard',
          description: leaderboardText,
          color: 0xffd700
        }]
      });
    }
    
    // Give command (admin)
    else if (commandName === 'give') {
      // Check if user has admin permissions
      if (user.id !== process.env.ADMIN_ID) {
        return interaction.reply({ content: '❌ You don\'t have permission to use this command.', ephemeral: true });
      }
      
      const target = options.getUser('user');
      const amount = options.getInteger('amount');
      
      if (economy.transferCoins(user.id, target.id, amount)) {
        await interaction.reply(`✅ You gave ${target.username} ${amount} coins.`);
      } else {
        await interaction.reply({ content: '❌ You don\'t have enough coins for this transfer.', ephemeral: true });
      }
    }
  } catch (error) {
    console.error('Command error:', error);
    await interaction.reply({ content: '❌ An error occurred while executing this command.', ephemeral: true });
  }
});

// ===== Bot Startup =====
async function startBot() {
  try {
    if (!process.env.BOT_TOKEN || !process.env.CLIENT_ID) {
      console.error('❌ Missing BOT_TOKEN or CLIENT_ID in environment variables');
      process.exit(1);
    }

    await registerSlashCommands();
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