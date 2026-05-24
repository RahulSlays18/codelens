const Database = require('better-sqlite3');
const db = new Database('codelens.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created  DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS analyses (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  INTEGER NOT NULL,
    code     TEXT,
    language TEXT,
    result   TEXT,
    created  DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS challenges (
    id           TEXT PRIMARY KEY,
    owner_id     INTEGER,
    owner_code   TEXT,
    owner_lang   TEXT,
    owner_result TEXT,
    rival_id     INTEGER,
    rival_code   TEXT,
    rival_lang   TEXT,
    rival_result TEXT,
    verdict      TEXT,
    created      DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS competitor_requests (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user TEXT NOT NULL,
    to_user   TEXT NOT NULL,
    status    TEXT DEFAULT 'pending',
    created   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_user, to_user)
  )
`).run();

module.exports = db;