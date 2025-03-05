module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/__tests__'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    moduleNameMapper: {
        '^@models/(.*)$': '<rootDir>/src/models/$1',
        '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@games/(.*)$': '<rootDir>/src/games/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
        '^@interfaces/(.*)$': '<rootDir>/src/interfaces/$1'
    },
    transform: {
        '^.+\\.ts?$': 'ts-jest'
    },
    testMatch: ['**/__tests__/**/*.test.ts'],
    clearMocks: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['src/**/*.ts', '!src/**/index.ts']
};
