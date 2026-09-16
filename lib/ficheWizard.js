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
const { buildFicheEmbed } = require('./embed');

const STEP_FIELDS = {
  1: ['nom', 'nom_heros', 'age', 'genre', 'statut'],
  2: ['apparence', 'personnalite', 'traits_positifs', 'traits_negatifs'],
  3: ['pouvoirs', 'faiblesses', 'equipement'],
  4: ['historique', 'objectifs', 'relations'],
};

function textInput(customId, label, style, { required = true, value } = {}) {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style)
    .setRequired(required)
    .setMaxLength(style === TextInputStyle.Paragraph ? 1000 : 100);
  if (value) input.setValue(value);
  return new ActionRowBuilder().addComponents(input);
}

function buildModal(step, draft = {}) {
  const modal = new ModalBuilder().setCustomId(`fiche_modal_${step}`);

  if (step === 1) {
    modal.setTitle('Fiche RP - Informations (1/4)');
    modal.addComponents(
      textInput('nom', 'Nom complet du personnage', TextInputStyle.Short, { value: draft.nom }),
      textInput('nom_heros', 'Nom de heros / alias', TextInputStyle.Short, { required: false, value: draft.nom_heros }),
      textInput('age', 'Age', TextInputStyle.Short, { value: draft.age }),
      textInput('genre', 'Genre', TextInputStyle.Short, { value: draft.genre }),
      textInput('statut', 'Statut / Rang', TextInputStyle.Short, { required: false, value: draft.statut })
    );
  } else if (step === 2) {
    modal.setTitle('Fiche RP - Apparence & personnalite (2/4)');
    modal.addComponents(
      textInput('apparence', 'Apparence physique', TextInputStyle.Paragraph, { value: draft.apparence }),
      textInput('personnalite', "Personnalite (vue d'ensemble)", TextInputStyle.Paragraph, { value: draft.personnalite }),
      textInput('traits_positifs', 'Traits positifs', TextInputStyle.Paragraph, { required: false, value: draft.traits_positifs }),
      textInput('traits_negatifs', 'Traits negatifs', TextInputStyle.Paragraph, { required: false, value: draft.traits_negatifs })
    );
  } else if (step === 3) {
    modal.setTitle('Fiche RP - Pouvoirs & faiblesses (3/4)');
    modal.addComponents(
      textInput('pouvoirs', 'Pouvoirs / capacites', TextInputStyle.Paragraph, { value: draft.pouvoirs }),
      textInput('faiblesses', 'Faiblesses / contraintes', TextInputStyle.Paragraph, { value: draft.faiblesses }),
      textInput('equipement', 'Equipement', TextInputStyle.Paragraph, { required: false, value: draft.equipement })
    );
  } else {
    modal.setTitle('Fiche RP - Historique (4/4)');
    modal.addComponents(
      textInput('historique', 'Historique / background', TextInputStyle.Paragraph, { value: draft.historique }),
      textInput('objectifs', 'Objectifs', TextInputStyle.Paragraph, { required: false, value: draft.objectifs }),
      textInput('relations', 'Relations importantes', TextInputStyle.Paragraph, { required: false, value: draft.relations })
    );
  }

  return modal;
}

function continueRow(step) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`fiche_step_${step}`)
      .setLabel(`Continuer (etape ${step}/4)`)
      .setStyle(ButtonStyle.Primary)
  );
}

async function startWizard(interaction) {
  drafts.set(interaction.user.id, {});
  await interaction.showModal(buildModal(1));
}

async function handleButton(interaction) {
  const step = Number(interaction.customId.split('_').pop());
  const draft = drafts.get(interaction.user.id);

  if (!draft) {
    await interaction.reply({
      content: 'Aucune creation de fiche en cours. Utilise `/fiche create` pour recommencer.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.showModal(buildModal(step, draft));
}

async function handleModal(interaction) {
  const step = Number(interaction.customId.split('_').pop());
  const draft = drafts.get(interaction.user.id) || {};

  for (const field of STEP_FIELDS[step]) {
    const value = interaction.fields.getTextInputValue(field);
    if (value) draft[field] = value;
  }

  drafts.set(interaction.user.id, draft);

  if (step < 4) {
    await interaction.reply({
      content: `Etape ${step}/4 enregistree. Clique pour continuer.`,
      components: [continueRow(step + 1)],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const fiche = { ...draft, updatedAt: new Date().toISOString() };
  db.saveFiche(interaction.guild.id, interaction.user.id, fiche);
  drafts.clear(interaction.user.id);

  const embed = buildFicheEmbed(interaction.user, fiche);
  await interaction.reply({ content: `Fiche RP de ${interaction.user} :`, embeds: [embed] });
}

module.exports = { startWizard, handleButton, handleModal };
