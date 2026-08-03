const { execSync } = require('child_process');

const csvData = execSync('curl -s -L "https://docs.google.com/spreadsheets/d/1D4nP-gPvzPxW4_xXkAPg2duWCC0igvupkhBhGkHXVno/export?format=csv&gid=1320360092"').toString();
const rows = csvData.split('\n').map(r => r.split(','));

for (let i = 0; i < 20; i++) {
  if (rows[i]) {
    console.log(`Row ${i}: ${rows[i].slice(9, 17).join(' | ')}`);
  }
}
