module.exports = {
  testEnvironment: 'node',
  transformIgnorePatterns: [
    '/node_modules/(?!uuid)/', // Transform uuid but ignore other node_modules
  ],
};