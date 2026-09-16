const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function filePath(guildId) {
  return path.join(DATA_DIR, `${guildId}.json`);
}

function loadAll(guildId) {
  const file = filePath(guildId);
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveAll(guildId, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath(guildId), JSON.stringify(data, null, 2), 'utf8');
}

function getFiche(guildId, userId) {
  const all = loadAll(guildId);
  return all[userId] || null;
}

function saveFiche(guildId, userId, fiche) {
  const all = loadAll(guildId);
  all[userId] = fiche;
  saveAll(guildId, all);
}

function deleteFiche(guildId, userId) {
  const all = loadAll(guildId);
  if (!(userId in all)) return false;
  delete all[userId];
  saveAll(guildId, all);
  return true;
}

function listFiches(guildId) {
  return loadAll(guildId);
}

module.exports = { getFiche, saveFiche, deleteFiche, listFiches };
