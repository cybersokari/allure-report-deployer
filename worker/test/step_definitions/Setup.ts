import { Given, setDefaultTimeout, When} from "@cucumber/cucumber";
import * as path from "node:path";
import {exec} from "node:child_process";
import {expect} from "chai";
setDefaultTimeout(40 * 1000)
export const defaultBucket = 'fir-demo-project.appspot.com'
// Helper to run a node command
async function runNodeApp(): Promise<{ stdout: string; stderr: string }> {
    return await new Promise((resolve, reject) => {
        const appPath = path.join(__dirname, 'lib/index.js'); // Update to the compiled JavaScript file
        const command = `node ${appPath}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(stderr || error.message);
            } else {
                resolve({stdout, stderr});
            }
        });
    });
}
Given(/^I set a valid Google Credential$/, function () {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = ''
});
Given(/^I set a valid Storage Bucket$/, function () {
    process.env.STORAGE_BUCKET = defaultBucket
});
// AfterAll(async () => {
//     await container.stop();
// })
Given(/^I set keepHistory to (true|false)$/, function (value: string) {
    process.env.KEEP_HISTORY = value
});
When(/^I run the app in CI mode$/, async function () {
    const result = await runNodeApp();
    expect(result.stderr).to.equal('fhfh');
    // (result.stdout).toContain('Execution completed successfully'); // Adjust to your app's actual output
});