import {exec} from 'child_process'
const credFilePath = 'cred/gcp-key.json'


// Utility function to run CLI command with custom environment
const runCommand = (command: string, env = {}) => {
    // Merge with existing process environment to preserve existing variables
    const testEnv = {
        ...process.env,
        ...env
    };

    return new Promise((resolve, reject) => {
        exec(command, { env: testEnv }, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
};

jest.mock('fs')
describe('', () => {
    test('Run console',async () => {

        const fileContent = `{"type": "service_account","project_id": "finna-app"}`;
        // Escape quotes and ensure proper JSON syntax
        const escapedFileContent = fileContent.replace(/"/g, '\\"');

        // Use echo to write the file and then run the node command
        const fullCommand = `
            mkdir -p ${credFilePath.split('/').slice(0, -1).join('/')} && \
            echo "${escapedFileContent}" > ${credFilePath} && \
            node lib/index.js
        `;


        const result = await runCommand(fullCommand, {
            STORAGE_BUCKET: 'test',
            GOOGLE_APPLICATION_CREDENTIALS: credFilePath,
        });

        expect(result).toContain('Usage:');
        expect(result).toContain('Options:');
    })
})
