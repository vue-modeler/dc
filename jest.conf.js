module.exports = {
  moduleFileExtensions: [
    'js',
    'ts',
  ],
  testMatch: [
    '<rootDir>/__tests__/**/*.spec.(js|ts)',
  ],
  transform: {
    '^.+\\.js$': '<rootDir>/../../../node_modules/babel-jest',
    '^.+\\.ts$': '<rootDir>/../../../node_modules/ts-jest',
  },
  coverageDirectory: '<rootDir>/test/unit/coverage',
  collectCoverageFrom: [
    '<rootDir>/**/*.{js,ts,vue}',
  ],
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!lodash)',
  ],
}
