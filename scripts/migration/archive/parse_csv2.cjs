const { execSync } = require('child_process');

const csvData = execSync('curl -s -L "https://docs.google.com/spreadsheets/d/1D4nP-gPvzPxW4_xXkAPg2duWCC0igvupkhBhGkHXVno/export?format=csv&gid=1320360092"').toString();
const rows = csvData.split('\n').map(r => r.split(','));

const kits = new Set();
for (let i = 0; i < rows.length; i++) {
  if (rows[i] && rows[i].length > 5 && rows[i][5]) {
    kits.add(rows[i][5]);
  }
  if (rows[i] && rows[i].length > 13 && rows[i][13]) {
    kits.add(rows[i][13]);
  }
}
console.log("Kits found:", Array.from(kits));
