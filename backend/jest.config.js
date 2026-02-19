/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts", "**/*.spec.ts"],
  modulePathIgnorePatterns: ["<rootDir>/dist"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/**/*.test.ts", "!src/**/*.spec.ts", "!src/integration/**"],
  setupFilesAfterEnv: [],
  testTimeout: 10000,
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
};
