const fs = require('fs');
const path = require('path');

const DRAFTS_DIR = path.join(__dirname, '..', 'data', 'drafts');
const memory = new Map();

function key(guildId, userId) {
  return `${guildId}:${userId}`;
}

function filePath(guildId, userId) {
  return path.join(DRAFTS_DIR, `${guildId}_${userId}.json`);
}

function get(guildId, userId) {
  const k = key(guildId, userId);
  if (memory.has(k)) return memory.get(k);

  const file = filePath(guildId, userId);
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    memory.set(k, data);
    return data;
  }

  return undefined;
}

function set(guildId, userId, data) {
  memory.set(key(guildId, userId), data);
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  fs.writeFileSync(filePath(guildId, userId), JSON.stringify(data, null, 2), 'utf8');
}

function clear(guildId, userId) {
  memory.delete(key(guildId, userId));
  const file = filePath(guildId, userId);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

module.exports = { get, set, clear };
