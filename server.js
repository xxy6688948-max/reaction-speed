const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/leaderboard', (_req, res) => {
  try {
    const scores = db.getLeaderboard();
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

app.post('/api/score', (req, res) => {
  const { name, score } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 20) {
    return res.status(400).json({ error: 'Name is required (1-20 characters)' });
  }
  if (!Number.isInteger(score) || score < 1 || score > 9999) {
    return res.status(400).json({ error: 'Score must be an integer between 1 and 9999' });
  }

  try {
    const result = db.insertScore(name.trim(), score);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
