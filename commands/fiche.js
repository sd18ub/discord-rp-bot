const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const drafts = require('../lib/drafts');
const db = require('../lib/db');
const { buildFicheEmbed } = require('../lib/embed');
const { startWizard } = require('../lib/ficheWizard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fiche')
    .setDescription('Gestion des fiches de personnage RP')
    .addSubcommand((sub) => sub.setName('create').setDescription('Cree ou remplace ta fiche RP'))
    .addSubcommand((sub) => sub.setName('annuler').setDescription('Annule la creation de fiche en cours'))
    .addSubcommand((sub) =>
      sub
        .setName('voir')
        .setDescription('Affiche une fiche RP')
        .addUserOption((opt) =>
          opt.setName('membre').setDescription('Membre dont afficher la fiche').setRequired(false)
        )
    )
    .addSubcommand((sub) => sub.setName('liste').setDescription('Liste les fiches RP du serveur'))
    .addSubcommand((sub) =>
      sub
        .setName('supprimer')
        .setDescription('Supprime une fiche RP')
        .addUserOption((opt) =>
          opt
            .setName('membre')
            .setDescription('Membre dont supprimer la fiche (admin uniquement)')
            .setRequired(false)
        )
    )
    .setDMPermission(false),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      await startWizard(interaction);
      return;
    }

    if (sub === 'annuler') {
      const had = drafts.get(interaction.user.id);
      drafts.clear(interaction.user.id);
      await interaction.reply({
        content: had ? 'Creation de fiche annulee.' : 'Aucune creation de fiche en cours.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === 'voir') {
      const target = interaction.options.getUser('membre') || interaction.user;
      const fiche = db.getFiche(interaction.guild.id, target.id);

      if (!fiche) {
        await interaction.reply({
          content:
            target.id === interaction.user.id
              ? "Tu n'as pas encore de fiche RP. Utilise `/fiche create`."
              : "Ce membre n'a pas de fiche RP.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.reply({ embeds: [buildFicheEmbed(target, fiche)] });
      return;
    }

    if (sub === 'liste') {
      const all = db.listFiches(interaction.guild.id);
      const entries = Object.entries(all);

      if (entries.length === 0) {
        await interaction.reply({
          content: 'Aucune fiche RP enregistree sur ce serveur.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const lines = entries.slice(0, 25).map(([userId, fiche]) => {
        const label = fiche.nom_heros ? `${fiche.nom} (${fiche.nom_heros})` : fiche.nom;
        return `<@${userId}> - **${label}**`;
      });

      await interaction.reply({
        content: `**Fiches RP du serveur (${entries.length}) :**\n${lines.join('\n')}${
          entries.length > 25 ? '\n... et plus' : ''
        }`,
      });
      return;
    }

    if (sub === 'supprimer') {
      const target = interaction.options.getUser('membre') || interaction.user;

      if (
        target.id !== interaction.user.id &&
        !interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)
      ) {
        await interaction.reply({
          content: 'Tu ne peux supprimer que ta propre fiche.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const deleted = db.deleteFiche(interaction.guild.id, target.id);
      await interaction.reply({
        content: deleted ? 'Fiche supprimee.' : "Cette personne n'avait pas de fiche.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
