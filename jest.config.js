module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/__tests__'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    moduleNameMapper: {
        '^models/(.*)$': '<rootDir>/src/models/$1'
    },
    transform: {
        '^.+\\.ts?$': 'ts-jest'
    },
    testMatch: ['**/__tests__/**/*.test.ts'],
    clearMocks: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['src/**/*.ts', '!src/**/index.ts']
};
