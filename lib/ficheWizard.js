const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const drafts = require('./drafts');
const db = require('./db');
const { getGuildConfig } = require('./config');
const { buildFicheEmbed } = require('./embed');
const { ensureValidationChannel } = require('./validationChannel');

const STEP_FIELDS = {
  1: ['nom', 'nom_heros', 'age', 'genre', 'statut'],
  2: ['apparence', 'personnalite', 'traits_positifs', 'traits_negatifs'],
  3: ['pouvoirs', 'faiblesses', 'equipement'],
  4: ['historique', 'objectifs', 'relations_notes', 'image_url'],
};

const SECTION_STEP = { base: 1, apparence: 2, pouvoirs: 3, historique: 4 };

function textInput(customId, label, style, { required = true, value } = {}) {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style)
    .setRequired(required)
    .setMaxLength(style === TextInputStyle.Paragraph ? 1000 : 300);
  if (value) input.setValue(value);
  return new ActionRowBuilder().addComponents(input);
}

function buildModal(step, draft, mode) {
  const modal = new ModalBuilder().setCustomId(`fiche_modal_${mode}_${step}`);
  const prefix = mode === 'e' ? 'Modifier - ' : '';

  if (step === 1) {
    modal.setTitle(`${prefix}Fiche RP - Informations (1/4)`);
    modal.addComponents(
      textInput('nom', 'Nom complet du personnage', TextInputStyle.Short, { value: draft.nom }),
      textInput('nom_heros', 'Nom de heros / alias', TextInputStyle.Short, { required: false, value: draft.nom_heros }),
      textInput('age', 'Age', TextInputStyle.Short, { value: draft.age }),
      textInput('genre', 'Genre', TextInputStyle.Short, { value: draft.genre }),
      textInput('statut', 'Statut / Rang', TextInputStyle.Short, { required: false, value: draft.statut })
    );
  } else if (step === 2) {
    modal.setTitle(`${prefix}Fiche RP - Apparence & personnalite (2/4)`);
    modal.addComponents(
      textInput('apparence', 'Apparence physique', TextInputStyle.Paragraph, { value: draft.apparence }),
      textInput('personnalite', "Personnalite (vue d'ensemble)", TextInputStyle.Paragraph, { value: draft.personnalite }),
      textInput('traits_positifs', 'Traits positifs', TextInputStyle.Paragraph, { required: false, value: draft.traits_positifs }),
      textInput('traits_negatifs', 'Traits negatifs', TextInputStyle.Paragraph, { required: false, value: draft.traits_negatifs })
    );
  } else if (step === 3) {
    modal.setTitle(`${prefix}Fiche RP - Pouvoirs & faiblesses (3/4)`);
    modal.addComponents(
      textInput('pouvoirs', 'Pouvoirs / capacites', TextInputStyle.Paragraph, { value: draft.pouvoirs }),
      textInput('faiblesses', 'Faiblesses / contraintes', TextInputStyle.Paragraph, { value: draft.faiblesses }),
      textInput('equipement', 'Equipement', TextInputStyle.Paragraph, { required: false, value: draft.equipement })
    );
  } else {
    modal.setTitle(`${prefix}Fiche RP - Historique (4/4)`);
    modal.addComponents(
      textInput('historique', 'Historique / background', TextInputStyle.Paragraph, { value: draft.historique }),
      textInput('objectifs', 'Objectifs', TextInputStyle.Paragraph, { required: false, value: draft.objectifs }),
      textInput('relations_notes', 'Relations (notes libres)', TextInputStyle.Paragraph, { required: false, value: draft.relations_notes }),
      textInput('image_url', 'Lien image (URL, optionnel)', TextInputStyle.Short, { required: false, value: draft.image_url })
    );
  }

  return modal;
}

function continueRow(step) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`fiche_step_c_${step}`)
      .setLabel(`Continuer (etape ${step}/4)`)
      .setStyle(ButtonStyle.Primary)
  );
}

async function startWizard(interaction) {
  drafts.set(interaction.guild.id, interaction.user.id, {});
  await interaction.showModal(buildModal(1, {}, 'c'));
}

async function startEdit(interaction, section) {
  const step = SECTION_STEP[section];
  const fiche = db.getFiche(interaction.guild.id, interaction.user.id);

  if (!fiche) {
    await interaction.reply({
      content: "Tu n'as pas encore de fiche. Utilise `/fiche create` d'abord.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.showModal(buildModal(step, fiche, 'e'));
}

async function handleButton(interaction) {
  const parts = interaction.customId.split('_'); // fiche_step_c_<step>
  const step = Number(parts[3]);
  const draft = drafts.get(interaction.guild.id, interaction.user.id);

  if (!draft) {
    await interaction.reply({
      content: 'Aucune creation de fiche en cours. Utilise `/fiche create` pour recommencer.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.showModal(buildModal(step, draft, 'c'));
}

// Publie la fiche dans le salon courant si aucune validation n'est requise,
// sinon la fait partir dans le salon de validation (cree/recupere automatiquement).
async function publishOrQueue(interaction, fiche, { isEdit }) {
  const { staffRoleId } = getGuildConfig(interaction.guild.id);

  if (!staffRoleId) {
    const embed = buildFicheEmbed(interaction.user, fiche);
    await interaction.reply({
      content: isEdit ? `Section mise a jour pour ${interaction.user} :` : `Fiche RP de ${interaction.user} :`,
      embeds: [embed],
    });
    return;
  }

  let channel;
  try {
    channel = await ensureValidationChannel(interaction.guild);
  } catch (err) {
    // Le bot n'a pas les droits necessaires pour preparer le salon : on publie quand meme
    // directement plutot que de bloquer l'utilisateur, en signalant le probleme.
    const embed = buildFicheEmbed(interaction.user, fiche);
    await interaction.reply({
      content:
        `${isEdit ? 'Section mise a jour' : 'Fiche publiee'} pour ${interaction.user} ` +
        `(le salon de validation n'a pas pu etre prepare : ${err.message}) :`,
      embeds: [embed],
    });
    return;
  }

  const embed = buildFicheEmbed(interaction.user, fiche);
  await channel.send({
    content: `${isEdit ? 'Fiche modifiee' : 'Nouvelle fiche'} en attente de validation pour ${interaction.user} — <@&${staffRoleId}>`,
    embeds: [embed],
  });

  await interaction.reply({
    content: `Ta fiche a ete soumise pour validation dans ${channel}.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleModal(interaction) {
  const parts = interaction.customId.split('_'); // fiche_modal_<mode>_<step>
  const mode = parts[2];
  const step = Number(parts[3]);
  const values = {};
  for (const field of STEP_FIELDS[step]) {
    const value = interaction.fields.getTextInputValue(field);
    if (value) values[field] = value;
  }

  if (mode === 'e') {
    const fiche = db.getFiche(interaction.guild.id, interaction.user.id) || {};
    Object.assign(fiche, values);

    const { staffRoleId } = getGuildConfig(interaction.guild.id);
    if (staffRoleId) {
      fiche.validation = {
        status: 'en_attente',
        by: null,
        at: new Date().toISOString(),
        comment: 'Fiche modifiee, en attente de revalidation',
      };
    }
    fiche.updatedAt = new Date().toISOString();

    db.saveFiche(interaction.guild.id, interaction.user.id, fiche);
    await publishOrQueue(interaction, fiche, { isEdit: true });
    return;
  }

  // mode 'c' : chaine de creation
  const draft = { ...(drafts.get(interaction.guild.id, interaction.user.id) || {}), ...values };
  drafts.set(interaction.guild.id, interaction.user.id, draft);

  if (step < 4) {
    await interaction.reply({
      content: `Etape ${step}/4 enregistree. Clique pour continuer.`,
      components: [continueRow(step + 1)],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { staffRoleId } = getGuildConfig(interaction.guild.id);
  const fiche = {
    ...draft,
    validation: staffRoleId
      ? { status: 'en_attente', by: null, at: new Date().toISOString(), comment: null }
      : { status: 'validee', by: null, at: new Date().toISOString(), comment: null },
    updatedAt: new Date().toISOString(),
  };

  db.saveFiche(interaction.guild.id, interaction.user.id, fiche);
  drafts.clear(interaction.guild.id, interaction.user.id);
  await publishOrQueue(interaction, fiche, { isEdit: false });
}

module.exports = { startWizard, startEdit, handleButton, handleModal };
