const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '..', 'data', 'config');

function filePath(guildId) {
  return path.join(CONFIG_DIR, `${guildId}.json`);
}

function getGuildConfig(guildId) {
  const file = filePath(guildId);
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function setGuildConfig(guildId, patch) {
  const updated = { ...getGuildConfig(guildId), ...patch };
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(filePath(guildId), JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}

module.exports = { getGuildConfig, setGuildConfig };
