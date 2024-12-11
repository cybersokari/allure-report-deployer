module.exports = {
    default: {
        require: ['test/step_definitions/*.ts'], // Load step definitions
        requireModule: ['ts-node/register'],      // Enable TypeScript in Cucumber
        format: ['json:reports/cucumber-report.json'], // Output report for Allure
    },
}