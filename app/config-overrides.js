const webpack = require('webpack');

module.exports = function override(config) {
  const fallback = config.resolve.fallback || {};

  Object.assign(fallback, {
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    assert: require.resolve('assert'),
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    os: require.resolve('os-browserify'),
    url: require.resolve('url'),
    zlib: require.resolve('browserify-zlib'),
    buffer: require.resolve('buffer'),
    vm: require.resolve('vm-browserify'),
    process: require.resolve('process/browser'),
  });

  config.resolve.fallback = fallback;

  // Add alias to handle process/browser imports
  config.resolve.alias = {
    ...config.resolve.alias,
    'process/browser.js': require.resolve('process/browser'),
    'process/browser': require.resolve('process/browser'),
    'process': require.resolve('process/browser'),
  };

  // Disable fully specified requirement for ES modules
  config.module.rules.push({
    test: /\.m?js$/,
    resolve: {
      fullySpecified: false,
    },
  });

  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ]);

  config.ignoreWarnings = [/Failed to parse source map/];

  return config;
};
