import type { Config } from '@jest/types';
import os from "node:os";

const config: Config.InitialOptions = {
    preset: 'ts-jest/presets/default-esm', // Use ESM preset for TypeScript
    testEnvironment: 'allure-jest/node', // Set the test environment to Allure
    collectCoverage: true,
    coverageReporters: ["json"],
    transformIgnorePatterns: [
        "/node_modules/(?!(ansi-escapes|chalk)/)" // Transform 'ansi-escapes' and 'chalk'
    ],
    testEnvironmentOptions: {
        environmentInfo: {
            "Platform": os.platform(),
            "Release": os.release(),
            "Version": os.version(),
            "Node version": process.version,
        },
    },
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: './tsconfig.test.json',
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