const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function exportSheetsToCSV(excelFilePath, outputDir) {
  // Read the workbook
  const workbook = XLSX.readFile(excelFilePath);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Process each sheet
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    // Convert sheet to CSV
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    // Determine output filename based on sheet name
    let fileName;
    switch (sheetName.toLowerCase()) {
      case 'assets':
        fileName = 'assets.csv';
        break;
      case 'orders':
        fileName = 'orders.csv';
        break;
      case 'settings':
        fileName = 'settings.csv';
        break;
      default:
        // For any other sheet, use the sheet name as filename
        fileName = `${sheetName.toLowerCase()}.csv`;
        break;
    }

    const outputPath = path.join(outputDir, fileName);
    fs.writeFileSync(outputPath, csv, 'utf8');
    console.log(`Exported sheet "${sheetName}" to ${outputPath}`);
  });
}

// Configuration
const excelFilePath = path.resolve('E:/experimindlabs/inventory/Invetory_mgmt.xlsx');
const outputDir = path.resolve('E:/experimindlabs/inventory');

// Run the conversion
try {
  exportSheetsToCSV(excelFilePath, outputDir);
  console.log('✅ All sheets exported successfully.');
} catch (error) {
  console.error('❌ Error exporting sheets:', error.message);
  process.exit(1);
}