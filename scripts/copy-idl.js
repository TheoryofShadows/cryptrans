const fs = require('fs');
const path = require('path');

// Copy IDL file from target to app/src/idl
const idlPath = path.join(__dirname, '../target/idl/cryptrans.json');
const destPath = path.join(__dirname, '../app/src/idl/cryptrans.json');

try {
  if (fs.existsSync(idlPath)) {
    const idl = fs.readFileSync(idlPath, 'utf8');
    fs.writeFileSync(destPath, idl);
    console.log('✓ IDL copied successfully to app/src/idl/');
  } else {
    console.log('⚠ IDL not found. Please run "anchor build" first.');
  }
} catch (error) {
  console.error('Error copying IDL:', error.message);
}

