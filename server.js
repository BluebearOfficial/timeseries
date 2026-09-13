const express = require('express');
const db = require('./db');
const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// ===== 按年聚合 =====
app.get('/api/yearly/:type', (req, res) => {
  const type = req.params.type;

  const rows = db.prepare(`
    SELECT
      substr(date, 1, 4) AS year,
      AVG(value) AS avg,
      MAX(value) AS max,
      MIN(value) AS min,
      COUNT(*)   AS count
    FROM records
    WHERE type = ?
    GROUP BY year
    ORDER BY year
  `).all(type);

  res.json({ ok: true, type, data: rows });
});

// ===== 按月聚合 =====
app.get('/api/monthly/:type', (req, res) => {
  const type = req.params.type;

  const rows = db.prepare(`
    SELECT
      substr(date, 1, 7) AS month,
      AVG(value) AS avg,
      SUM(value) AS sum,
      COUNT(*)   AS count
    FROM records
    WHERE type = ?
    GROUP BY month
    ORDER BY month
  `).all(type);

  res.json({ ok: true, type, data: rows });
});

// ===== 总体统计 =====
app.get('/api/stats/:type', (req, res) => {
  const type = req.params.type;

  const row = db.prepare(`
    SELECT
      COUNT(*)   AS count,
      AVG(value) AS avg,
      MAX(value) AS max,
      MIN(value) AS min,
      MIN(date)  AS firstDate,
      MAX(date)  AS lastDate
    FROM records
    WHERE type = ?
  `).get(type);

  res.json({ ok: true, type, stats: row });
});

app.listen(3000, () => {
  console.log('时间序列后端跑起来了：http://localhost:3000');
});