const fs = require('fs');
const { execSync } = require('child_process');

const csvData = execSync('curl -s -L "https://docs.google.com/spreadsheets/d/1D4nP-gPvzPxW4_xXkAPg2duWCC0igvupkhBhGkHXVno/export?format=csv&gid=1320360092"').toString();
const rows = csvData.split('\n').map(r => r.split(','));

console.log("Found rows:", rows.length);
for(let i=0; i<30; i++) {
  if (rows[i]) {
    console.log(`Row ${i}: ${rows[i].slice(0, 18).join(' | ')}`);
  }
}
