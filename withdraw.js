const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const balancesFile = 'balances.json';
let balances = {};

// Load balances from file
if (fs.existsSync(balancesFile)) {
    balances = JSON.parse(fs.readFileSync(balancesFile, 'utf8'));
}

// Function to save balances to file
function saveBalances() {
    fs.writeFileSync(balancesFile, JSON.stringify(balances, null, 2));
}

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const args = message.content.split(' ');
    const command = args[0].toLowerCase();

    if (command === '!withdraw') {
        const amount = parseInt(args[1]);
        const userId = message.author.id;

        if (isNaN(amount) || amount <= 0) {
            return message.reply('Please enter a valid amount to withdraw.');
        }

        if (!balances[userId]) {
            balances[userId] = 1000; // Default starting balance
        }

        if (balances[userId] < amount) {
            return message.reply('You do not have enough balance to withdraw this amount.');
        }

        balances[userId] -= amount;
        saveBalances();
        message.reply(`You have successfully withdrawn $${amount}. Your new balance is $${balances[userId]}.`);
    }

    if (command === '!balance') {
        const userId = message.author.id;
        if (!balances[userId]) {
            balances[userId] = 1000; // Default balance if not set
        }
        message.reply(`Your current balance is $${balances[userId]}.`);
    }
});

client.login('MTM0MTc0ODcwMzQ3MTU5OTYyNg.GgbOdi.-jm-AiyP3WgMfWHqocPXv0z4iNh02IsqbDatX0');
