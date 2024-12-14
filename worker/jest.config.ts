import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    preset: 'ts-jest/presets/default-esm', // Use ESM preset for TypeScript
    testEnvironment: 'node', // Set the test environment to Node.js
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },
    extensionsToTreatAsEsm: ['.ts'], // Treat `.ts` files as ESM
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1', // Fixes issues with .js extensions in ESM imports
    },
};

export default config;