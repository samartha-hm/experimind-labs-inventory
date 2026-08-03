const fs = require('fs');
const path = require('path');

/**
 * Read a CSV file and return rows as arrays
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array<Array<string>>>} - Array of rows, each row is array of cell values
 */
function readCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      // Split by lines and then by commas
      const lines = data.trim().split('\n');
      const rows = lines.map(line => line.split(',').map(cell => cell.trim()));

      resolve(rows);
    });
  });
}

// If called directly with a filename argument
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node read_local_csv.cjs <path-to-csv-file>');
    process.exit(1);
  }

  readCSVFile(path.resolve(filePath))
    .then(rows => {
      console.log(`Found ${rows.length} rows:`);
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        console.log(`Row ${i}: ${rows[i].join(' | ')}`);
      }
      if (rows.length > 20) {
        console.log(`... and ${rows.length - 20} more rows`);
      }
    })
    .catch(err => {
      console.error('Error reading CSV file:', err.message);
      process.exit(1);
    });
}

module.exports = العشري{ readCSVFile };