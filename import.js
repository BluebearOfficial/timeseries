const XLSX = require('xlsx');
const db = require('./db');

function excelDateToISO(serial) {
  const utcDays = serial - 25569;
  const date = new Date(utcDays * 86400 * 1000);
  return date.toISOString().slice(0, 10);
}

const files = [
  { file: './data/temperature.xlsx', type: 'temperature' },
  { file: './data/steps.xlsx',       type: 'steps' },
  { file: './data/activity.xlsx',    type: 'activity' },
];

const insert = db.prepare(`
  INSERT OR REPLACE INTO records (date, type, value)
  VALUES (?, ?, ?)
`);

for (const { file, type } of files) {
  console.log(`\n导入 ${file} ...`);

  const wb = XLSX.readFile(file);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  let count = 0;
  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      if (!row.date || row.value === undefined) continue;

      let dateStr;
      if (typeof row.date === 'number') {
        dateStr = excelDateToISO(row.date);  // ← 数字就转
      } else {
        dateStr = String(row.date).trim();   // 字符串就用原值
      }

      insert.run(dateStr, type, Number(row.value));
      count++;
    }
  });

  insertMany(rows);
  console.log(`  完成，共 ${count} 条`);
}

console.log('\n全部导入完成。');