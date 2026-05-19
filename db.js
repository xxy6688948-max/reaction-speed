const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'scores.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const insertStmt = db.prepare('INSERT INTO scores (name, score) VALUES (?, ?)');
const leaderboardStmt = db.prepare(
  'SELECT id, name, score, created_at FROM scores ORDER BY score ASC LIMIT 20'
);

function getLeaderboard() {
  return leaderboardStmt.all();
}

function insertScore(name, score) {
  return insertStmt.run(name, score);
}

module.exports = { getLeaderboard, insertScore };
