// jest.config.js
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom', // ✅ This makes DOM APIs like document available
    testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)']
};