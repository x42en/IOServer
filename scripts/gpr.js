const fs = require('fs');
const { join } = require('path');

try {
  // Get the package object and change the name for GitHub Packages
  const pkgPath = join(__dirname, '../package.json');
  const pkg = require('../package.json');
  
  // Store original name for restoration
  const originalName = pkg.name;
  
  // Update name for GitHub Packages (scoped)
  pkg.name = '@x42en/ioserver';
  
  // Update registry for GitHub Packages
  pkg.publishConfig = {
    registry: 'https://npm.pkg.github.com'
  };
  
  console.log(`Preparing package for GitHub Packages:`);
  console.log(`  Original name: ${originalName}`);
  console.log(`  GitHub Packages name: ${pkg.name}`);
  console.log(`  Registry: ${pkg.publishConfig.registry}`);
  
  // Update package.json with the updated configuration
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  
  console.log('✅ Package prepared for GitHub Packages publishing');
  
} catch (error) {
  console.error('❌ Error preparing package for GitHub Packages:', error.message);
  process.exit(1);
}