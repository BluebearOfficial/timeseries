const Database = require('better-sqlite3');
const db = new Database('./timeseries.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    PRIMARY KEY (date, type)
  );
`);

module.exports = db;