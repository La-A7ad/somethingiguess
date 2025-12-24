module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  transform: { "^.+\\.(js|jsx)$": "babel-jest" },
  moduleNameMapper: { "\\.(css)$": "identity-obj-proxy" },
  collectCoverageFrom: ["src/**/*.{js,jsx}", "!src/main.jsx"],
  coverageThreshold: { global: { lines: 80 } },
};
