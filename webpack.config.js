const path = require('path');

module.exports = (env, argv) => {
  const mode = argv.mode ?? 'production'
  const configs = [
    {
      entry: './index.ts',
      output: {
        filename: 'autodiff.js',
        path: path.resolve(__dirname, 'build'),
        libraryTarget: 'umd',
        library: 'AutoDiff',
      },
    },
    {
      entry: './p5.warp.ts',
      output: {
        filename: 'p5.warp.js',
        path: path.resolve(__dirname, 'build'),
      },
    },
  ].map((partialConfig) => ({
    ...partialConfig,
    context: path.resolve(__dirname, 'src'),
    mode,
    module: {
      rules: [{
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js']
    },
  }));

  return configs.map((config) => {
    if (mode === 'development') {
      config.devtool = 'inline-source-map'
    }
    return config;
  })
};
