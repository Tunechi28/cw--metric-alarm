const path = require('path');
const name = 'cw-metric-alarm';

module.exports = {
    entry: `./${name}.js`,
    output: {
        filename: `./${name}.js`,
        path: path.resolve(__dirname, 'dist'),
        library: name,
        libraryTarget: 'umd'
    },
    externals: [
        'tls',
        'fs',
        'net',
        'aws-sdk'
    ],
    mode: 'production',
    target: 'node',
    stats: {
        warnings: false
    }
};