const { execSync } = require('child_process');

const csvData = execSync('curl -s -L "https://docs.google.com/spreadsheets/d/1D4nP-gPvzPxW4_xXkAPg2duWCC0igvupkhBhGkHXVno/export?format=csv&gid=1320360092"').toString();
const rows = csvData.split('\n').map(r => r.split(','));

const t1 = [];
const t2 = [];
for (let i = 0; i < 40; i++) {
  if (rows[i]) {
     const kit1 = rows[i][5];
     const comp1 = rows[i][6];
     const qty1 = rows[i][8];
     if (kit1) t1.push(`${kit1} - ${comp1} - ${qty1}`);

     const kit2 = rows[i][13];
     const comp2 = rows[i][14];
     const qty2 = rows[i][16];
     if (kit2) t2.push(`${kit2} - ${comp2} - ${qty2}`);
  }
}
console.log("Table 1:\n", t1.join('\n'));
console.log("\nTable 2:\n", t2.join('\n'));
