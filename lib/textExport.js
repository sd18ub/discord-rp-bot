function buildFicheText(user, fiche) {
  const lines = [];
  lines.push(`FICHE RP - ${fiche.nom}${fiche.nom_heros ? ` alias ${fiche.nom_heros}` : ''}`);
  lines.push('='.repeat(50));
  lines.push(`Age: ${fiche.age || '-'}`);
  lines.push(`Genre: ${fiche.genre || '-'}`);
  lines.push(`Statut: ${fiche.statut || '-'}`);
  if (fiche.validation) {
    lines.push(`Validation: ${fiche.validation.status}${fiche.validation.comment ? ` (${fiche.validation.comment})` : ''}`);
  }
  lines.push('');

  const section = (title, text) => {
    if (!text) return;
    lines.push(`-- ${title} --`);
    lines.push(text);
    lines.push('');
  };

  section('Apparence', fiche.apparence);
  section('Personnalite', fiche.personnalite);
  section('Traits positifs', fiche.traits_positifs);
  section('Traits negatifs', fiche.traits_negatifs);
  section('Pouvoirs / Capacites', fiche.pouvoirs);
  section('Faiblesses', fiche.faiblesses);
  section('Equipement', fiche.equipement);
  section('Historique', fiche.historique);
  section('Objectifs', fiche.objectifs);
  section('Relations (notes)', fiche.relations_notes);

  if (fiche.relations && fiche.relations.length) {
    lines.push('-- Relations --');
    fiche.relations.forEach((r) => {
      lines.push(`- ${r.userId} : ${r.type} (confiance ${r.confiance}/10, affection ${r.affection}/10)`);
    });
    lines.push('');
  }

  lines.push(`Exporte le ${new Date().toLocaleString('fr-FR')} pour ${user.tag}`);
  return lines.join('\n');
}

module.exports = { buildFicheText };
