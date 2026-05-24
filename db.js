const Database = require('better-sqlite3');
const db = new Database('codelens.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT    UNIQUE NOT NULL,
    password TEXT    NOT NULL,
    created  TEXT    DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS analyses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    code       TEXT,
    language   TEXT,
    result     TEXT,
    created    TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS challenges (
    id          TEXT PRIMARY KEY,
    owner_id    INTEGER,
    owner_code  TEXT,
    owner_lang  TEXT,
    owner_result TEXT,
    rival_id    INTEGER,
    rival_code  TEXT,
    rival_lang  TEXT,
    rival_result TEXT,
    verdict     TEXT,
    created     TEXT DEFAULT (datetime('now'))
    );
`);

module.exports = db;