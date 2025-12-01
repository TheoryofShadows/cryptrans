const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Download Powers of Tau file from Perpetual Powers of Tau ceremony
 * This is a one-time download (~60MB for 2^21 constraints)
 */

const PTAU_URL = 'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_21.ptau';
const PTAU_PATH = path.join(__dirname, 'powersOfTau28_hez_final_21.ptau');

console.log('📥 Downloading Powers of Tau file...');
console.log('This is a one-time download (~60MB)');
console.log('');

if (fs.existsSync(PTAU_PATH)) {
  console.log('✅ Powers of Tau file already exists!');
  console.log(`Location: ${PTAU_PATH}`);
  process.exit(0);
}

const file = fs.createWriteStream(PTAU_PATH);

https.get(PTAU_URL, (response) => {
  if (response.statusCode !== 200) {
    console.error(`❌ Failed to download: HTTP ${response.statusCode}`);
    process.exit(1);
  }

  const totalSize = parseInt(response.headers['content-length'], 10);
  let downloaded = 0;
  let lastPercent = 0;

  response.on('data', (chunk) => {
    downloaded += chunk.length;
    const percent = Math.floor((downloaded / totalSize) * 100);
    
    if (percent !== lastPercent && percent % 10 === 0) {
      console.log(`Progress: ${percent}%`);
      lastPercent = percent;
    }
  });

  response.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log('');
    console.log('✅ Download complete!');
    console.log(`Saved to: ${PTAU_PATH}`);
    console.log('');
    console.log('Next step: Run npm run setup to generate proving keys');
  });

}).on('error', (err) => {
  fs.unlink(PTAU_PATH, () => {});
  console.error('❌ Download failed:', err.message);
  process.exit(1);
});

file.on('error', (err) => {
  fs.unlink(PTAU_PATH, () => {});
  console.error('❌ File write failed:', err.message);
  process.exit(1);
});

