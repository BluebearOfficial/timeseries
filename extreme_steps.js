const db = require('./db');

// 历史最高步数 Top 5
const maxSteps = db.prepare(`
  SELECT date, value FROM records 
  WHERE type = 'steps' 
  ORDER BY value DESC LIMIT 5
`).all();

// 历史最低步数 Top 5
const minSteps = db.prepare(`
  SELECT date, value FROM records 
  WHERE type = 'steps' 
  ORDER BY value ASC LIMIT 5
`).all();

console.log('\n=== 历史步数最高 Top 5 ===');
console.table(maxSteps);

console.log('\n=== 历史步数最低 Top 5 ===');
console.table(minSteps);