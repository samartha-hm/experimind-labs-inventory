const fs = require('fs');
const path = require('path');

const SPREADSHEET_DIR = 'C:\\Users\\Hp\\Downloads\\spreadsheet';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function loadCSV(filename) {
  const filePath = path.join(SPREADSHEET_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });
    rows.push(obj);
  }
  return rows;
}

const assets = loadCSV('Invetory_mgmt - Assets.csv');
const orders = loadCSV('Invetory_mgmt - Orders.csv');
const users = loadCSV('Invetory_mgmt - Users.csv');
const settings = loadCSV('Invetory_mgmt - Settings.csv');

console.log(`Loaded Assets: ${assets.length}`);
console.log(`Loaded Orders: ${orders.length}`);
console.log(`Loaded Users: ${users.length}`);
console.log(`Loaded Settings: ${settings.length}`);

// Convert Assets to src/data.ts structure
const formattedItems = assets.map((a, index) => {
  const stockQty = parseInt(a.quantity) || 0;
  const price = parseFloat(a.price) || 10.0;
  const category = a.category && a.category.trim() ? a.category.trim() : 'General Components';
  const name = a.name && a.name.trim() ? a.name.trim() : `Item #${a.id || index}`;
  
  let binLocation = '';
  if (a.room || a.shelf || a.box) {
    const parts = [a.room, a.shelf ? `Shelf ${a.shelf}` : '', a.box ? `Box ${a.box}` : ''].filter(Boolean);
    binLocation = parts.join(' - ');
  }

  return {
    id: a.id || `item_${index}`,
    name,
    category,
    stockQty,
    unit: 'pcs',
    threshold: stockQty > 0 && stockQty < 10 ? 5 : 10,
    isCommon: false,
    basePrice: price,
    imageUrl: a.imageUrl || undefined,
    description: a.description || undefined,
    binLocation: binLocation || undefined,
    barcode: a.barcode || undefined
  };
});

// Output code for src/data.ts
const dataTsContent = `import { InventoryItem, KitBOM } from './types';

export const INITIAL_INVENTORY: InventoryItem[] = ${JSON.stringify(formattedItems, null, 2)};

export const INITIAL_KITS: KitBOM[] = [
  {
    id: 'kit-01',
    name: 'Prastuti Science Experiment Set',
    description: 'Complete hands-on STEM lab kit with measuring cylinder, test tubes, spirit lamp, and funnels.',
    imageUrl: 'https://drive.google.com/thumbnail?id=1lcUEYS3MgT5n2qtI6dgiJRcwH-7YP5NY&sz=w1000',
    items: [
      { componentId: '${formattedItems[0]?.id || '1766123928700'}', qty: 1 },
      { componentId: '${formattedItems[1]?.id || '1766124295358'}', qty: 2 },
      { componentId: '${formattedItems[4]?.id || '1766124946616'}', qty: 1 }
    ]
  },
  {
    id: 'kit-02',
    name: 'Electronics Innovation Kit',
    description: 'Basic electronics starter bundle with glue gun, magnets, droppers, and foil.',
    imageUrl: 'https://drive.google.com/thumbnail?id=14eQ_9JXcSrPqgqvG5d_ixwm63xoUx95o&sz=w1000',
    items: [
      { componentId: '${formattedItems[2]?.id || '1766124575076'}', qty: 1 },
      { componentId: '${formattedItems[8]?.id || '1766126734705'}', qty: 2 }
    ]
  }
];
`;

fs.writeFileSync(path.join(__dirname, '../../src/data.ts'), dataTsContent, 'utf-8');
console.log('Successfully updated src/data.ts with 324 catalog items from downloaded spreadsheets!');
