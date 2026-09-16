// Brouillons de fiche en cours de creation, en memoire (perdus si le bot redemarre)
const drafts = new Map();

module.exports = {
  get: (userId) => drafts.get(userId),
  set: (userId, data) => drafts.set(userId, data),
  clear: (userId) => drafts.delete(userId),
};
