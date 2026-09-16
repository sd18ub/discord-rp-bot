const { EmbedBuilder } = require('discord.js');

const MAX_CHUNKS = 3;

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

function buildFicheEmbed(user, fiche) {
  const title = fiche.nom_heros ? `${fiche.nom} alias ${fiche.nom_heros}` : fiche.nom;

  const embed = new EmbedBuilder()
    .setTitle(title || 'Fiche RP')
    .setColor(0x5865f2)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: 'Age', value: fiche.age || 'Non renseigne', inline: true },
      { name: 'Genre', value: fiche.genre || 'Non renseigne', inline: true },
      { name: 'Statut', value: fiche.statut || 'Non renseigne', inline: true }
    );

  addChunkedField(embed, 'Apparence', fiche.apparence);
  addChunkedField(embed, 'Personnalite', fiche.personnalite);
  if (fiche.traits_positifs) addChunkedField(embed, 'Traits positifs', fiche.traits_positifs);
  if (fiche.traits_negatifs) addChunkedField(embed, 'Traits negatifs', fiche.traits_negatifs);
  addChunkedField(embed, 'Pouvoirs / Capacites', fiche.pouvoirs);
  addChunkedField(embed, 'Faiblesses', fiche.faiblesses);
  if (fiche.equipement) addChunkedField(embed, 'Equipement', fiche.equipement);
  addChunkedField(embed, 'Historique', fiche.historique);
  if (fiche.objectifs) addChunkedField(embed, 'Objectifs', fiche.objectifs);
  if (fiche.relations) addChunkedField(embed, 'Relations', fiche.relations);

  embed.setFooter({ text: `Fiche de ${user.tag}` }).setTimestamp();
  return embed;
}

module.exports = { buildFicheEmbed };
