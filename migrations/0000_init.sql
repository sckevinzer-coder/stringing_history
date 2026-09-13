
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournamentId INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  participant1Id INTEGER REFERENCES participants(id) ON DELETE SET NULL,
  participant2Id INTEGER REFERENCES participants(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'singles',
  participant3Id INTEGER REFERENCES participants(id) ON DELETE SET NULL,
  participant4Id INTEGER REFERENCES participants(id) ON DELETE SET NULL,
  teamAId INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  teamBId INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  score1 INTEGER NOT NULL DEFAULT 0,
  score2 INTEGER NOT NULL DEFAULT 0,
  sets TEXT,
  round TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'group',
  status TEXT NOT NULL DEFAULT 'scheduled',
  winnerId INTEGER REFERENCES participants(id) ON DELETE SET NULL,
  court TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournamentId);
