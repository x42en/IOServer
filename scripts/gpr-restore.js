const fs = require('fs');
const { join } = require('path');

try {
  // Restore original package.json after GitHub Packages publishing
  const pkgPath = join(__dirname, '../package.json');
  const pkg = require('../package.json');
  
  // Restore original name
  pkg.name = 'ioserver';
  
  // Remove GitHub Packages specific config
  delete pkg.publishConfig;
  
  console.log(`Restoring package configuration:`);
  console.log(`  Restored name: ${pkg.name}`);
  console.log(`  Removed GitHub Packages registry config`);
  
  // Update package.json with the restored configuration
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  
  console.log('✅ Package configuration restored');
  
} catch (error) {
  console.error('❌ Error restoring package configuration:', error.message);
  process.exit(1);
}