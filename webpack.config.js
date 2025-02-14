const path = require('path');

module.exports = {
  mode: 'production',
  entry: './dist/index.js',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs2',
  },
  target: 'node',
  externals: {
    'nostr-tools': 'commonjs nostr-tools',
    'ws': 'commonjs ws',
  },
};
