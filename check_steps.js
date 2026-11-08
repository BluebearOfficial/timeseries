const db = require('./db');

// 1. 查“必低步数日” (设定阈值：低于 2000 步)
const lowSteps = db.prepare(`
  SELECT 
    substr(date, 6, 5) AS month_day, 
    substr(date, 6, 2) AS month,
    COUNT(*) AS total_years,
    SUM(value) AS total_steps
  FROM records
  WHERE type = 'steps'
  GROUP BY month_day
  HAVING total_years >= 3 AND (total_steps / total_years) < 2000
  ORDER BY month_day
`).all();

console.log(`\n=== 【必低步数日】 (每年都低于 2000 步) ===`);
console.log(`共 ${lowSteps.length} 天:`);
console.log(lowSteps.map(d => d.month_day).join(', ') || '无');


// 2. 查“必高步数日” (设定阈值：高于 15000 步)
const highSteps = db.prepare(`
  SELECT 
    substr(date, 6, 5) AS month_day, 
    substr(date, 6, 2) AS month,
    COUNT(*) AS total_years,
    SUM(value) AS total_steps
  FROM records
  WHERE type = 'steps'
  GROUP BY month_day
  HAVING total_years >= 3 AND (total_steps / total_years) > 15000
  ORDER BY month_day
`).all();

console.log(`\n=== 【必高步数日】 (每年都高于 15000 步) ===`);
console.log(`共 ${highSteps.length} 天:`);
console.log(highSteps.map(d => d.month_day).join(', ') || '无');


// 3. 顺便查一下，你的历史最高/最低步数记录
const maxStep = db.prepare(`SELECT date, value FROM records WHERE type = 'steps' ORDER BY value DESC LIMIT 1`).get();
const minStep = db.prepare(`SELECT date, value FROM records WHERE type = 'steps' ORDER BY value ASC LIMIT 1`).get();

console.log(`\n=== 历史极值 ===`);
console.log(`最高步数: ${maxStep.value} (${maxStep.date})`);
console.log(`最低步数: ${minStep.value} (${minStep.date})`);


// 查这 3 天的历史明细
const details = db.prepare(`
  SELECT date, value 
  FROM records 
  WHERE type = 'steps' AND substr(date, 6, 5) IN ('01-05', '10-26', '11-02')
  ORDER BY date
`).all();

console.log('\n=== 历史明细 ===');
console.table(details);

// 查“严格必低步数日”
const strictLow = db.prepare(`
  SELECT substr(date, 6, 5) AS month_day, COUNT(*) AS years, MAX(value) AS max_step
  FROM records
  WHERE type = 'steps'
  GROUP BY month_day
  HAVING years >= 3 AND max_step < 2000
  ORDER BY month_day
`).all();

console.log(`\n=== 严格必低步数日 (每年都低于 2000 步) ===`);
console.log(strictLow.map(d => d.month_day).join(', ') || '无');


