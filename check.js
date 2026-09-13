const db = require('./db');
console.log(db.prepare('SELECT * FROM records LIMIT 5').all());
console.log(db.prepare("SELECT MIN(date) as min, MAX(date) as max FROM records WHERE type='temperature'").get());