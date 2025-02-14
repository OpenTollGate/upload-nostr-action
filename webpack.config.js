const path = require('path');

module.exports = {
  entry: './index.js',  // Your main entry point (adjust if necessary)
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs2', // Important for GitHub Actions
  },
  target: 'node', // Important for Node.js environment
  externals: {
    '@actions/core': 'commonjs @actions/core',
    'nostr-tools': 'commonjs nostr-tools',
    'ws': 'commonjs ws',
  },
};
