const { PermissionFlagsBits } = require('discord.js');
const { getGuildConfig } = require('./config');

// Staff RP : le role configure via /fiche config role-staff, sinon repli sur "Gerer les roles"
function isStaff(interaction) {
  if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return true;

  const { staffRoleId } = getGuildConfig(interaction.guild.id);
  if (staffRoleId) return interaction.member.roles.cache.has(staffRoleId);

  return interaction.member.permissions.has(PermissionFlagsBits.ManageRoles);
}

// Reserve aux gestionnaires du serveur (definition du role staff, etc.)
function isServerManager(interaction) {
  return (
    interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
    interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
  );
}

module.exports = { isStaff, isServerManager };
