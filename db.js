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

// Clean duplicate names: keep only best score per name
const dupes = db.prepare(
  'SELECT name, MIN(score) as best FROM scores GROUP BY name HAVING COUNT(*) > 1'
).all();
for (const row of dupes) {
  db.prepare('DELETE FROM scores WHERE name = ? AND score > ?').run(row.name, row.best);
  db.prepare('DELETE FROM scores WHERE name = ? AND score = ? AND id NOT IN (SELECT MIN(id) FROM scores WHERE name = ? AND score = ?)').run(row.name, row.best, row.name, row.best);
}

db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_name ON scores(name)`);

const upsertStmt = db.prepare(`
  INSERT INTO scores (name, score, created_at)
  VALUES (@name, @score, CURRENT_TIMESTAMP)
  ON CONFLICT(name) DO UPDATE SET
    score = CASE WHEN excluded.score < scores.score THEN excluded.score ELSE scores.score END,
    created_at = CASE WHEN excluded.score < scores.score THEN CURRENT_TIMESTAMP ELSE scores.created_at END
`);

const leaderboardStmt = db.prepare(
  'SELECT id, name, score, created_at FROM scores ORDER BY score ASC LIMIT 20'
);

function getLeaderboard() {
  return leaderboardStmt.all();
}

function insertScore(name, score) {
  return upsertStmt.run({ name, score });
}

module.exports = { getLeaderboard, insertScore };
