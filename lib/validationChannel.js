const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('./config');

// Recupere (ou cree) le salon de validation, et synchronise ses permissions
// avec le role staff configure. Lance une erreur si le bot n'a pas les droits
// necessaires pour creer/configurer le salon (a charge de l'appelant de l'afficher).
async function ensureValidationChannel(guild) {
  const config = getGuildConfig(guild.id);
  let channel = null;

  if (config.validationChannelId) {
    channel = await guild.channels.fetch(config.validationChannelId).catch(() => null);
  }

  if (!channel) {
    channel = await guild.channels.create({
      name: 'validation-fiches',
      type: ChannelType.GuildText,
      reason: 'Salon de validation des fiches RP cree automatiquement par le bot',
    });
    setGuildConfig(guild.id, { validationChannelId: channel.id });
  }

  const botMember = guild.members.me || (await guild.members.fetchMe());
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: botMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
  ];
  if (config.staffRoleId) {
    overwrites.push({ id: config.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
  }

  await channel.permissionOverwrites.set(overwrites, 'Synchronisation des acces au salon de validation RP');

  return channel;
}

module.exports = { ensureValidationChannel };
