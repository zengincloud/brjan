const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  // MV3 CSP forbids eval() — must disable eval-based devtools
  devtool: 'cheap-module-source-map',
  entry: {
    background: './src/background/service-worker.ts',
    'content/linkedin': './src/content/linkedin.ts',
    'content/messaging': './src/content/messaging.ts',
    'popup/popup': './src/popup/popup.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'public', to: '.' },
        { from: 'src/popup/popup.html', to: 'popup/popup.html' },
      ],
    }),
  ],
  optimization: {
    minimize: true,
  },
};
