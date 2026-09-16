require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, MessageFlags } = require('discord.js');
const ficheWizard = require('./lib/ficheWizard');

const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN doit etre defini dans le fichier .env');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

const commandsDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsDir, file));
  client.commands.set(command.data.name, command);
}

client.once('clientReady', () => {
  console.log(`Connecte en tant que ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) await command.execute(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('fiche_step_')) {
      await ficheWizard.handleButton(interaction);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('fiche_modal_')) {
      await ficheWizard.handleModal(interaction);
      return;
    }
  } catch (err) {
    console.error('Erreur interaction:', err);
    const payload = { content: "Une erreur s'est produite.", flags: MessageFlags.Ephemeral };
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    } catch {
      // interaction deja expiree, rien a faire
    }
  }
});

client.login(DISCORD_TOKEN);
