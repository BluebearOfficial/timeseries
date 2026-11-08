const db = require('./db');

const rows = db.prepare(`
  SELECT date, value 
  FROM records 
  WHERE type = 'activity' 
    AND substr(date, 6, 5) IN ('01-07', '02-01', '04-03') 
  ORDER BY date
`).all();

console.table(rows);