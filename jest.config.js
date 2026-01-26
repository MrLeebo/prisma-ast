module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transformIgnorePatterns: ['node_modules/(?!(chevrotain|@chevrotain|lodash-es)/)'],
  moduleNameMapper: {
    '^@chevrotain/(.*)$': '<rootDir>/node_modules/@chevrotain/$1/lib/src/api.js',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': ['babel-jest', { configFile: './babel.config.js' }],
  },
};
