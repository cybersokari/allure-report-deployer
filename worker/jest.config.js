/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest"],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(p-limit|yocto-queue)/)', // Allow these specific ESM packages to be transformed
  ],
};