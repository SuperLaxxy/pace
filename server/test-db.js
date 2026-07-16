const { db } = require('./db/index.js');
console.log(db.prepare('SELECT * FROM elections').all());
console.log(db.prepare('SELECT * FROM candidates').all());
