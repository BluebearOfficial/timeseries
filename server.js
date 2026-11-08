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


app.get('/api/cumulative/:type/:year', (req, res) => {
  const type = req.params.type;
  const year = req.params.year;

  const rows = db.prepare(`
    SELECT
      substr(date, 6, 2) AS month,
      AVG(value) AS avg,
      SUM(value) AS sum,
      COUNT(*)   AS count
    FROM records
    WHERE type = ? AND substr(date, 1, 4) = ?
    GROUP BY month
    ORDER BY month
  `).all(type, year);

  // 算累积
  let cumSum = 0;
  let cumCount = 0;
  const cumulative = rows.map(r => {
    cumSum += r.sum;
    cumCount += r.count;
    return {
      month: r.month,
      monthlyAvg: r.avg,
      cumulativeAvg: cumSum / cumCount,
    };
  });

  res.json({ ok: true, type, year, data: cumulative });
});


app.get('/api/peak-month/:type', (req, res) => {
  const type = req.params.type;

  const rows = db.prepare(`
    SELECT
      substr(date, 1, 4) AS year,
      substr(date, 6, 2) AS month,
      AVG(value) AS avg,
      COUNT(*) AS count
    FROM records
    WHERE type = ?
    GROUP BY year, month
    ORDER BY year, month
  `).all(type);

  const byYear = {};
  for (const r of rows) {
    if (!byYear[r.year]) byYear[r.year] = [];
    byYear[r.year].push(r);
  }

  const result = [];
  for (const year in byYear) {
    const months = byYear[year];
    let cumSum = 0, cumCount = 0;
    let peakMonth = null, peakAvg = -Infinity;

    for (const m of months) {
      cumSum += m.avg * m.count;
      cumCount += m.count;
      const cumAvg = cumSum / cumCount;
      if (cumAvg > peakAvg) {
        peakAvg = cumAvg;
        peakMonth = m.month;
      }
    }

    if (cumCount >= 300) {
      result.push({ year, peakMonth, peakAvg });
    }
  }

  res.json({ ok: true, type, data: result });
});

app.get('/api/monthly-trend/:type/:month', (req, res) => {
  const type = req.params.type;
  const month = req.params.month.padStart(2, '0');  // 传 9 变 "09"

  const rows = db.prepare(`
    SELECT
      substr(date, 1, 4) AS year,
      AVG(value) AS avg,
      COUNT(*)   AS count
    FROM records
    WHERE type = ? AND substr(date, 6, 2) = ?
    GROUP BY year
    ORDER BY year
  `).all(type, month);

  // 过滤不完整年份（该月天数不够）
  const data = rows.filter(r => r.count >= 25);

  res.json({ ok: true, type, month, data });
});


app.get('/api/daily/:type/:year/:month', (req, res) => {
  const type = req.params.type;
  const year = req.params.year;
  const month = req.params.month.padStart(2, '0');

  const rows = db.prepare(`
    SELECT date, value
    FROM records
    WHERE type = ? AND substr(date, 1, 4) = ? AND substr(date, 6, 2) = ?
    ORDER BY date
  `).all(type, year, month);

  res.json({ ok: true, type, year, month, data: rows });
});

app.get('/api/hot-days/:type/:month/:threshold', (req, res) => {
  const type = req.params.type;
  const month = req.params.month.padStart(2, '0');
  const threshold = Number(req.params.threshold);

  const rows = db.prepare(`
    WITH years AS (
      SELECT DISTINCT substr(date, 1, 4) AS year
      FROM records
      WHERE type = ? AND substr(date, 6, 2) = ?
    )
    SELECT
      y.year,
      COALESCE(COUNT(r.date), 0) AS hotDays
    FROM years y
    LEFT JOIN records r
      ON substr(r.date, 1, 4) = y.year
      AND r.type = ?
      AND substr(r.date, 6, 2) = ?
      AND r.value >= ?
    GROUP BY y.year
    ORDER BY y.year
  `).all(type, month, type, month, threshold);

  res.json({ ok: true, type, month, threshold, data: rows });
});


app.get('/api/compare/steps-activity', (req, res) => {
  const rows = db.prepare(`
    SELECT
      a.value AS activity,
      AVG(s.value) AS avgSteps,
      COUNT(*) AS days
    FROM records s
    JOIN records a ON s.date = a.date
    WHERE s.type = 'steps' AND a.type = 'activity'
    GROUP BY a.value
  `).all();

  res.json({ ok: true, data: rows });
});

app.get('/api/weekday/:type', (req, res) => {
  const type = req.params.type;

  const rows = db.prepare(`
    SELECT
      strftime('%w', date) AS weekday,
      AVG(value) AS avg,
      COUNT(*) AS days,
      SUM(value) AS total
    FROM records
    WHERE type = ?
    GROUP BY weekday
    ORDER BY weekday
  `).all(type);

  res.json({ ok: true, type, data: rows });
});


app.get('/api/month-dist/:type', (req, res) => {
  const type = req.params.type;

  const rows = db.prepare(`
    SELECT
      substr(date, 6, 2) AS month,
      AVG(value) AS avg,
      SUM(value) AS total,
      COUNT(*) AS days
    FROM records
    WHERE type = ?
    GROUP BY month
    ORDER BY month
  `).all(type);

  res.json({ ok: true, type, data: rows });
});


app.get('/api/day/:date', (req, res) => {
  const date = req.params.date;

  const rows = db.prepare(`
    SELECT type, value
    FROM records
    WHERE date = ?
  `).all(date);

  // 转成对象：{ temperature: 34.2, steps: 5000, ... }
  const result = { date };
  for (const r of rows) {
    result[r.type] = r.value;
  }

  res.json({ ok: true, data: result });
});


app.get('/api/top/:type', (req, res) => {
  const type = req.params.type;
  const n = Number(req.query.n) || 10;  // 默认前 10

  const rows = db.prepare(`
    SELECT date, value
    FROM records
    WHERE type = ?
    ORDER BY value DESC
    LIMIT ?
  `).all(type, n);

  res.json({ ok: true, type, n, data: rows });
});

app.get('/api/moving-avg/:type/:window/:year', (req, res) => {
  const type = req.params.type;
  const windowSize = Number(req.params.window);
  const year = req.params.year;

  const rows = db.prepare(`
    SELECT date, value
    FROM records
    WHERE type = ? AND substr(date, 1, 4) = ?
    ORDER BY date
  `).all(type, year);

  const result = [];
  for (let i = 0; i < rows.length; i++) {
    if (i < windowSize - 1) continue;

    let sum = 0;
    for (let j = i - windowSize + 1; j <= i; j++) {
      sum += rows[j].value;
    }
    result.push({
      date: rows[i].date,
      value: rows[i].value,
      avg: sum / windowSize,
    });
  }

  res.json({ ok: true, type, window: windowSize, year, data: result });
});


app.get('/api/correlation/:type1/:type2', (req, res) => {
  const t1 = req.params.type1;
  const t2 = req.params.type2;

  // 只取两个数据都有的日期
  const rows = db.prepare(`
    SELECT
      a.date,
      a.value AS v1,
      b.value AS v2
    FROM records a
    JOIN records b ON a.date = b.date
    WHERE a.type = ? AND b.type = ?
    ORDER BY a.date
  `).all(t1, t2);

  if (rows.length < 2) {
    return res.json({ ok: false, msg: '数据太少' });
  }

  // 算皮尔逊相关系数
  const n = rows.length;
  const sum1 = rows.reduce((s, r) => s + r.v1, 0);
  const sum2 = rows.reduce((s, r) => s + r.v2, 0);
  const mean1 = sum1 / n;
  const mean2 = sum2 / n;

  let cov = 0, var1 = 0, var2 = 0;
  for (const r of rows) {
    const d1 = r.v1 - mean1;
    const d2 = r.v2 - mean2;
    cov += d1 * d2;
    var1 += d1 * d1;
    var2 += d2 * d2;
  }

  const r = cov / Math.sqrt(var1 * var2);

  res.json({
    ok: true,
    type1: t1,
    type2: t2,
    n: rows.length,
    correlation: r,
  });
});


app.get('/api/steps-by-temp', (req, res) => {
  const rows = db.prepare(`
    SELECT
      CAST(t.value / 5 AS INTEGER) * 5 AS tempBucket,
      AVG(s.value) AS avgSteps,
      COUNT(*) AS days
    FROM records t
    JOIN records s ON t.date = s.date
    WHERE t.type = 'temperature' AND s.type = 'steps'
    GROUP BY tempBucket
    ORDER BY tempBucket
  `).all();

  res.json({ ok: true, data: rows });
});


app.get('/api/activity-by-temp', (req, res) => {
  const rows = db.prepare(`
    SELECT
      CAST(t.value / 5 AS INTEGER) * 5 AS tempBucket,
      AVG(a.value) AS avgActivity,
      COUNT(*) AS days
    FROM records t
    JOIN records a ON t.date = a.date
    WHERE t.type = 'temperature' AND a.type = 'activity'
    GROUP BY tempBucket
    ORDER BY tempBucket
  `).all();

  res.json({ ok: true, data: rows });
});

app.get('/api/season-all', (req, res) => {
  const summer = Number(req.query.summer) || 25;
  const winter = Number(req.query.winter) || 12;

  const rows = db.prepare(`
    SELECT
      substr(date, 1, 4) AS year,
      SUM(CASE WHEN value >= ? THEN 1 ELSE 0 END) AS summer,
      SUM(CASE WHEN value < ? THEN 1 ELSE 0 END) AS winter,
      COUNT(*) AS total
    FROM records
    WHERE type = 'temperature'
    GROUP BY year
    ORDER BY year
  `).all(summer, winter);

  const data = rows.filter(r => r.total >= 300);
  res.json({ ok: true, data });
});

const multer = require('multer');
const XLSX = require('xlsx');
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload/:type', upload.single('file'), (req, res) => {
  const type = req.params.type;

  if (!req.file) {
    return res.json({ ok: false, msg: '没有文件' });
  }

  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const insert = db.prepare(`
      INSERT OR REPLACE INTO records (date, type, value)
      VALUES (?, ?, ?)
    `);

    let count = 0;
    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        if (!row.date || row.value === undefined) continue;

        let dateStr;
        if (typeof row.date === 'number') {
          const utcDays = row.date - 25569;
          const date = new Date(utcDays * 86400 * 1000);
          dateStr = date.toISOString().slice(0, 10);
        } else {
          dateStr = String(row.date).trim();
        }

        insert.run(dateStr, type, Number(row.value));
        count++;
      }
    });

    insertMany(rows);

    res.json({ ok: true, type, count });
  } catch (e) {
    res.json({ ok: false, msg: e.message });
  }
});


app.get('/api/calendar/:type', (req, res) => {
  const type = req.params.type;

  const rows = db.prepare(`
    SELECT 
      substr(date, 6, 5) AS month_day,
      COUNT(*) AS total,
      SUM(CASE WHEN value > 0 THEN 1 ELSE 0 END) AS hits,
      MAX(value) AS max_val,
      MIN(value) AS min_val
    FROM records
    WHERE type = ?
    GROUP BY month_day
  `).all(type);

  const result = rows.map(r => {
    let status = 'normal';
    if (r.total >= 2) { 
      if (type === 'activity') {
        if (r.hits === 0) status = 'never';          
        if (r.hits === r.total) status = 'always';   
      } else if (type === 'steps') {
        // 步数判定：这几年里最高都没过 5000 -> 必宅；最低都超过 10000 -> 必走
        if (r.max_val < 5000) status = 'never';
        if (r.min_val > 10000) status = 'always';
      }
    }
    return { date: r.month_day, status };
  });

  res.json({ ok: true, data: result });
});


// ===== 滑动克制度（天数/次数） =====
app.get('/api/sliding-gap/:type/:window/:year', (req, res) => {
  const type = req.params.type;
  const windowSize = Number(req.params.window);
  const year = req.params.year;

  // 获取该年份的数据（按日期排序）
  const rows = db.prepare(`
    SELECT date, value
    FROM records
    WHERE type = ? AND substr(date, 1, 4) = ?
    ORDER BY date
  `).all(type, year);

  const result = [];
  
  for (let i = 0; i < rows.length; i++) {
    if (i < windowSize - 1) continue; // 前 29 天不够算

    let count = 0;
    // 统计过去 windowSize 天的总次数
    for (let j = i - windowSize + 1; j <= i; j++) {
      count += rows[j].value;
    }

    // 你的新算法：克制度 = 窗口天数 / 次数
    // 如果次数为 0，直接封顶到 60
    let gap = count > 0 ? (windowSize / count) : 60;

    result.push({
      date: rows[i].date,
      gap: gap,
      count: count
    });
  }

  res.json({ ok: true, type, window: windowSize, year, data: result });
});

app.get('/api/streaks/:type', (req, res) => {
  const type = req.params.type;

  const rows = db.prepare(`
    SELECT date, value
    FROM records
    WHERE type = ?
    ORDER BY date
  `).all(type);

  if (rows.length === 0) return res.json({ ok: true, message: '没有数据' });

  let currentStreak = 0;
  let maxStreak = 0;
  let maxStreakDate = '';
  
  let allGaps = []; // 存放所有的空窗期
  let lastEventDate = null;

  function daysBetween(d1, d2) {
    const t1 = new Date(d1).getTime();
    const t2 = new Date(d2).getTime();
    return Math.round(Math.abs(t2 - t1) / (1000 * 60 * 60 * 24));
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (row.value === 1) {
      // 1. 统计连击
      if (i > 0 && daysBetween(rows[i-1].date, row.date) === 1 && rows[i-1].value === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        maxStreakDate = row.date;
      }

      // 2. 记录这一次的空窗
      if (lastEventDate) {
        const gapDays = daysBetween(lastEventDate, row.date) - 1;
        if (gapDays > 0) {
          allGaps.push({
            days: gapDays,
            startDate: lastEventDate,
            endDate: row.date
          });
        }
      }
      lastEventDate = row.date;
    } else {
      currentStreak = 0;
    }
  }

  // 把所有的空窗期按天数从大到小排序，取前 10 个
  allGaps.sort((a, b) => b.days - a.days);
  const top10Gaps = allGaps.slice(0, 10);

  res.json({
    ok: true,
    type,
    maxStreak: { days: maxStreak, endDate: maxStreakDate },
    top10Gaps
  });
});

// ===== 步数与活动交叉分析（步数分箱看活动率） =====
app.get('/api/activity-by-steps', (req, res) => {
  const rows = db.prepare(`
    SELECT
      -- 步数分箱：每 2000 步一档
      CAST(s.value / 2000 AS INTEGER) * 2000 AS stepBucket,
      COUNT(*) AS totalDays,
      SUM(a.value) AS activeDays,
      -- 计算活动率：活动天数 / 总天数
      ROUND(CAST(SUM(a.value) AS FLOAT) / COUNT(*), 4) AS activityRate
    FROM records s
    JOIN records a ON s.date = a.date
    WHERE s.type = 'steps' AND a.type = 'activity'
    GROUP BY stepBucket
    ORDER BY stepBucket
  `).all();

  // 为了前端图表好看，把分箱起点（如 0）和终点（如 1999）拼成标签
  const data = rows.map(r => ({
    range: `${r.stepBucket} ~ ${r.stepBucket + 1999} 步`,
    totalDays: r.totalDays,
    activeDays: r.activeDays,
    activityRate: r.activityRate
  }));

  res.json({ ok: true, data });
});


// ===== 统计每月的万步日天数 =====
app.get('/api/monthly-wanbu', (req, res) => {
  const rows = db.prepare(`
    SELECT 
      substr(date, 1, 7) AS month,
      SUM(CASE WHEN value >= 10000 THEN 1 ELSE 0 END) AS wanbu_days,
      COUNT(*) AS total_days
    FROM records
    WHERE type = 'steps'
    GROUP BY month
    ORDER BY month
  `).all();

  res.json({ ok: true, data: rows });
});

// ===== 统计每年有几个“活动>=10次”的月份 =====
app.get('/api/yearly-10activity', (req, res) => {
  const rows = db.prepare(`
    SELECT 
      year,
      COUNT(*) AS months_reached_10
    FROM (
      SELECT 
        substr(date, 1, 4) AS year,
        substr(date, 1, 7) AS month,
        SUM(value) AS monthly_total
      FROM records
      WHERE type = 'activity'
      GROUP BY year, month
      HAVING monthly_total >= 10
    )
    GROUP BY year
    ORDER BY year
  `).all();

  res.json({ ok: true, data: rows });
});



app.listen(3000, () => {
  console.log('时间序列后端跑起来了：http://localhost:3000');
});