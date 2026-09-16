const { SlashCommandBuilder, AttachmentBuilder, ChannelType, MessageFlags } = require('discord.js');
const drafts = require('../lib/drafts');
const db = require('../lib/db');
const { setGuildConfig } = require('../lib/config');
const { isStaff, isServerManager } = require('../lib/permissions');
const { buildFicheEmbed } = require('../lib/embed');
const { buildFicheText } = require('../lib/textExport');
const { startWizard, startEdit } = require('../lib/ficheWizard');
const { ensureValidationChannel } = require('../lib/validationChannel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fiche')
    .setDescription('Gestion des fiches de personnage RP')
    .addSubcommand((sub) => sub.setName('create').setDescription('Cree ta fiche RP (formulaire en 4 etapes)'))
    .addSubcommand((sub) => sub.setName('annuler').setDescription('Annule la creation de fiche en cours'))
    .addSubcommand((sub) =>
      sub
        .setName('modifier')
        .setDescription('Modifie une section de ta fiche existante')
        .addStringOption((opt) =>
          opt
            .setName('section')
            .setDescription('Section a modifier')
            .setRequired(true)
            .addChoices(
              { name: 'Informations de base', value: 'base' },
              { name: 'Apparence & personnalite', value: 'apparence' },
              { name: 'Pouvoirs & faiblesses', value: 'pouvoirs' },
              { name: 'Historique & objectifs', value: 'historique' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('voir')
        .setDescription('Affiche une fiche RP')
        .addUserOption((opt) => opt.setName('membre').setDescription('Membre dont afficher la fiche').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('liste')
        .setDescription('Liste les fiches RP du serveur')
        .addStringOption((opt) =>
          opt.setName('recherche').setDescription('Mot-cle (nom, pouvoirs, personnalite...)').setRequired(false)
        )
        .addStringOption((opt) => opt.setName('rang').setDescription('Filtrer par rang/statut').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('supprimer')
        .setDescription('Supprime une fiche RP')
        .addUserOption((opt) =>
          opt.setName('membre').setDescription('Membre dont supprimer la fiche (staff uniquement)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('valider')
        .setDescription("Valide ou refuse la fiche d'un membre (staff uniquement)")
        .addUserOption((opt) => opt.setName('membre').setDescription('Membre dont valider la fiche').setRequired(true))
        .addStringOption((opt) =>
          opt
            .setName('statut')
            .setDescription('Decision')
            .setRequired(true)
            .addChoices({ name: 'Validee', value: 'validee' }, { name: 'Refusee', value: 'refusee' })
        )
        .addStringOption((opt) => opt.setName('commentaire').setDescription('Commentaire (optionnel)').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('export')
        .setDescription('Exporte une fiche en fichier texte')
        .addUserOption((opt) => opt.setName('membre').setDescription('Membre dont exporter la fiche').setRequired(false))
    )
    .addSubcommandGroup((group) =>
      group
        .setName('relation')
        .setDescription('Gere les relations de ta fiche')
        .addSubcommand((sub) =>
          sub
            .setName('ajouter')
            .setDescription('Ajoute ou met a jour une relation')
            .addUserOption((opt) => opt.setName('membre').setDescription('Membre concerne').setRequired(true))
            .addStringOption((opt) =>
              opt.setName('type').setDescription('Type de relation (ami, ennemi, famille...)').setRequired(true)
            )
            .addIntegerOption((opt) =>
              opt.setName('confiance').setDescription('Niveau de confiance (0-10)').setMinValue(0).setMaxValue(10).setRequired(false)
            )
            .addIntegerOption((opt) =>
              opt.setName('affection').setDescription("Niveau d'affection (0-10)").setMinValue(0).setMaxValue(10).setRequired(false)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('retirer')
            .setDescription('Retire une relation')
            .addUserOption((opt) => opt.setName('membre').setDescription('Membre a retirer').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('liste')
            .setDescription('Liste les relations d\'une fiche')
            .addUserOption((opt) => opt.setName('membre').setDescription('Membre dont voir les relations').setRequired(false))
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('config')
        .setDescription('Configuration du bot (admin)')
        .addSubcommand((sub) =>
          sub
            .setName('role-staff')
            .setDescription('Definit le role staff RP et son salon de validation')
            .addRoleOption((opt) => opt.setName('role').setDescription('Role staff').setRequired(true))
            .addChannelOption((opt) =>
              opt
                .setName('salon')
                .setDescription('Salon de validation existant (sinon le bot en cree un automatiquement)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
            )
        )
    )
    .setDMPermission(false),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    if (group === 'relation') return handleRelation(interaction, sub);
    if (group === 'config') return handleConfig(interaction, sub);

    if (sub === 'create') return startWizard(interaction);

    if (sub === 'annuler') {
      const had = drafts.get(interaction.guild.id, interaction.user.id);
      drafts.clear(interaction.guild.id, interaction.user.id);
      await interaction.reply({
        content: had ? 'Creation de fiche annulee.' : 'Aucune creation de fiche en cours.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === 'modifier') {
      const section = interaction.options.getString('section', true);
      return startEdit(interaction, section);
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
      const recherche = interaction.options.getString('recherche');
      const rang = interaction.options.getString('rang');
      const all = db.listFiches(interaction.guild.id);
      let entries = Object.entries(all);

      if (rang) {
        const q = rang.toLowerCase();
        entries = entries.filter(([, f]) => (f.statut || '').toLowerCase().includes(q));
      }
      if (recherche) {
        const q = recherche.toLowerCase();
        entries = entries.filter(([, f]) =>
          [f.nom, f.nom_heros, f.personnalite, f.pouvoirs].some((v) => (v || '').toLowerCase().includes(q))
        );
      }

      if (entries.length === 0) {
        await interaction.reply({
          content: 'Aucune fiche RP ne correspond a ces criteres.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const lines = entries.slice(0, 25).map(([userId, fiche]) => {
        const label = fiche.nom_heros ? `${fiche.nom} (${fiche.nom_heros})` : fiche.nom;
        const statusTag = fiche.validation && fiche.validation.status !== 'validee' ? ` [${fiche.validation.status}]` : '';
        return `<@${userId}> - **${label}**${statusTag}`;
      });

      await interaction.reply({
        content: `**Fiches RP (${entries.length}) :**\n${lines.join('\n')}${
          entries.length > 25 ? '\n... et plus' : ''
        }`,
      });
      return;
    }

    if (sub === 'supprimer') {
      const target = interaction.options.getUser('membre') || interaction.user;

      if (target.id !== interaction.user.id && !isStaff(interaction)) {
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
      return;
    }

    if (sub === 'valider') {
      if (!isStaff(interaction)) {
        await interaction.reply({
          content: "Tu n'as pas la permission de valider des fiches.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const target = interaction.options.getUser('membre', true);
      const statut = interaction.options.getString('statut', true);
      const commentaire = interaction.options.getString('commentaire');

      const fiche = db.getFiche(interaction.guild.id, target.id);
      if (!fiche) {
        await interaction.reply({ content: "Ce membre n'a pas de fiche.", flags: MessageFlags.Ephemeral });
        return;
      }

      fiche.validation = {
        status: statut,
        by: interaction.user.tag,
        at: new Date().toISOString(),
        comment: commentaire || null,
      };
      db.saveFiche(interaction.guild.id, target.id, fiche);

      await interaction.reply(
        `Fiche de ${target} marquee comme **${statut === 'validee' ? 'validee' : 'refusee'}** par ${interaction.user}.` +
          (commentaire ? `\nCommentaire : ${commentaire}` : '')
      );
      return;
    }

    if (sub === 'export') {
      const target = interaction.options.getUser('membre') || interaction.user;
      const fiche = db.getFiche(interaction.guild.id, target.id);

      if (!fiche) {
        await interaction.reply({ content: 'Pas de fiche a exporter.', flags: MessageFlags.Ephemeral });
        return;
      }

      const text = buildFicheText(target, fiche);
      const filename = `${(fiche.nom || 'fiche').replace(/[^a-z0-9_-]/gi, '_')}.txt`;
      const attachment = new AttachmentBuilder(Buffer.from(text, 'utf8'), { name: filename });

      await interaction.reply({ files: [attachment], flags: MessageFlags.Ephemeral });
    }
  },
};

async function handleRelation(interaction, sub) {
  if (sub === 'ajouter') {
    const fiche = db.getFiche(interaction.guild.id, interaction.user.id);
    if (!fiche) {
      await interaction.reply({
        content: "Tu dois d'abord creer ta fiche avec `/fiche create`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const membre = interaction.options.getUser('membre', true);
    const type = interaction.options.getString('type', true);
    const confiance = interaction.options.getInteger('confiance') ?? 5;
    const affection = interaction.options.getInteger('affection') ?? 5;

    fiche.relations = fiche.relations || [];
    const idx = fiche.relations.findIndex((r) => r.userId === membre.id);
    const entry = { userId: membre.id, type, confiance, affection };
    if (idx >= 0) fiche.relations[idx] = entry;
    else fiche.relations.push(entry);

    db.saveFiche(interaction.guild.id, interaction.user.id, fiche);
    await interaction.reply({
      content: `Relation avec ${membre} enregistree (${type}, confiance ${confiance}/10, affection ${affection}/10).`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === 'retirer') {
    const fiche = db.getFiche(interaction.guild.id, interaction.user.id);
    if (!fiche || !fiche.relations || fiche.relations.length === 0) {
      await interaction.reply({ content: 'Aucune relation enregistree.', flags: MessageFlags.Ephemeral });
      return;
    }

    const membre = interaction.options.getUser('membre', true);
    const before = fiche.relations.length;
    fiche.relations = fiche.relations.filter((r) => r.userId !== membre.id);
    db.saveFiche(interaction.guild.id, interaction.user.id, fiche);

    await interaction.reply({
      content: fiche.relations.length < before ? 'Relation retiree.' : 'Aucune relation trouvee avec ce membre.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === 'liste') {
    const target = interaction.options.getUser('membre') || interaction.user;
    const fiche = db.getFiche(interaction.guild.id, target.id);

    if (!fiche || !fiche.relations || fiche.relations.length === 0) {
      await interaction.reply({ content: 'Aucune relation enregistree.', flags: MessageFlags.Ephemeral });
      return;
    }

    const lines = fiche.relations.map(
      (r) => `<@${r.userId}> — ${r.type} (confiance ${r.confiance}/10, affection ${r.affection}/10)`
    );
    await interaction.reply({ content: `**Relations de ${target} :**\n${lines.join('\n')}` });
  }
}

async function handleConfig(interaction, sub) {
  if (sub === 'role-staff') {
    if (!isServerManager(interaction)) {
      await interaction.reply({ content: 'Reserve aux administrateurs du serveur.', flags: MessageFlags.Ephemeral });
      return;
    }

    const role = interaction.options.getRole('role', true);
    const salonExistant = interaction.options.getChannel('salon');

    setGuildConfig(interaction.guild.id, {
      staffRoleId: role.id,
      ...(salonExistant ? { validationChannelId: salonExistant.id } : {}),
    });

    try {
      const channel = await ensureValidationChannel(interaction.guild);
      await interaction.reply({
        content: `Role staff RP defini sur ${role}. Les fiches en attente de validation seront postees dans ${channel}.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      await interaction.reply({
        content:
          `Role staff RP defini sur ${role}, mais je n'ai pas pu creer/configurer le salon de validation ` +
          `(${err.message}). Donne-moi la permission **Gerer les salons**, ou relance la commande avec ` +
          `l'option \`salon\` en pointant vers un salon existant.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
