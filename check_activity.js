const db = require('./db');

// 找必不活动：有记录的年份 >= 3 年，且全是 0
const neverDo = db.prepare(`
  SELECT 
    substr(date, 6, 5) AS month_day, 
    substr(date, 6, 2) AS month,
    COUNT(*) AS total_years,
    SUM(CASE WHEN value = 0 THEN 1 ELSE 0 END) AS zeros
  FROM records
  WHERE type = 'activity'
  GROUP BY month_day
  HAVING zeros = total_years AND total_years >= 3
  ORDER BY month_day
`).all();

console.log(`\n【必不活动日期】(共 ${neverDo.length} 天):`);
console.log(neverDo.map(d => `${d.month_day} (${d.total_years}年)`).join(', ') || '无');

// 按月统计
const monthlyStats = {};
neverDo.forEach(d => {
  monthlyStats[d.month] = (monthlyStats[d.month] || 0) + 1;
});
console.log('\n【按月统计必不活动天数】:');
console.log(monthlyStats);