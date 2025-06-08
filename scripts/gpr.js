const fs = require('fs');
const { join } = require('path');

// Get the package object and change the name for GitHub Packages
const pkg = require('../package.json');
pkg.name = '@x42en/ioserver';

// Update package.json with the updated name
fs.writeFileSync(join(__dirname, '../package.json'), JSON.stringify(pkg, null, 2));