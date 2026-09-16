const { EmbedBuilder } = require('discord.js');

const MAX_CHUNKS = 3;

const STATUS_COLORS = { validee: 0x57f287, en_attente: 0xfee75c, refusee: 0xed4245 };
const STATUS_LABELS = {
  validee: '✅ Validee',
  en_attente: '🕓 En attente de validation',
  refusee: '❌ Refusee',
};

function chunk(text, size = 1024) {
  let remaining = text && text.trim() ? text : 'Non renseigne';
  const parts = [];
  while (remaining.length > size && parts.length < MAX_CHUNKS - 1) {
    parts.push(remaining.slice(0, size));
    remaining = remaining.slice(size);
  }
  parts.push(remaining.length > size ? `${remaining.slice(0, size - 1)}…` : remaining);
  return parts;
}

function addChunkedField(embed, label, text) {
  chunk(text).forEach((part, i) => {
    embed.addFields({ name: i === 0 ? label : `${label} (suite)`, value: part });
  });
}

function isValidHttpUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function buildFicheEmbed(user, fiche) {
  const title = fiche.nom_heros ? `${fiche.nom} alias ${fiche.nom_heros}` : fiche.nom;
  const status = fiche.validation?.status;

  const embed = new EmbedBuilder()
    .setTitle(title || 'Fiche RP')
    .setColor(status ? STATUS_COLORS[status] : 0x5865f2)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: 'Age', value: fiche.age || 'Non renseigne', inline: true },
      { name: 'Genre', value: fiche.genre || 'Non renseigne', inline: true },
      { name: 'Statut', value: fiche.statut || 'Non renseigne', inline: true }
    );

  if (status) {
    let statusText = STATUS_LABELS[status] || status;
    if (fiche.validation.comment) statusText += `\n> ${fiche.validation.comment}`;
    embed.addFields({ name: 'Statut de validation', value: statusText });
  }

  addChunkedField(embed, 'Apparence', fiche.apparence);
  addChunkedField(embed, 'Personnalite', fiche.personnalite);
  if (fiche.traits_positifs) addChunkedField(embed, 'Traits positifs', fiche.traits_positifs);
  if (fiche.traits_negatifs) addChunkedField(embed, 'Traits negatifs', fiche.traits_negatifs);
  addChunkedField(embed, 'Pouvoirs / Capacites', fiche.pouvoirs);
  addChunkedField(embed, 'Faiblesses', fiche.faiblesses);
  if (fiche.equipement) addChunkedField(embed, 'Equipement', fiche.equipement);
  addChunkedField(embed, 'Historique', fiche.historique);
  if (fiche.objectifs) addChunkedField(embed, 'Objectifs', fiche.objectifs);
  if (fiche.relations_notes) addChunkedField(embed, 'Relations (notes)', fiche.relations_notes);

  if (fiche.relations && fiche.relations.length) {
    const lines = fiche.relations.map(
      (r) => `<@${r.userId}> — ${r.type} (confiance ${r.confiance}/10, affection ${r.affection}/10)`
    );
    embed.addFields({ name: 'Relations', value: lines.join('\n').slice(0, 1024) });
  }

  if (fiche.image_url && isValidHttpUrl(fiche.image_url)) {
    embed.setImage(fiche.image_url);
  }

  embed.setFooter({ text: `Fiche de ${user.tag}` }).setTimestamp();
  return embed;
}

module.exports = { buildFicheEmbed };
