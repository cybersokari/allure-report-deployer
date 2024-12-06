import * as fs from "fs/promises";
import {StringBuilder} from "./string-builder";
import * as fsSync from "fs";
import * as path from "node:path";
import * as util from 'node:util'
import {REPORTS_DIR, websiteId} from "../index";
import {validateWebsiteExpires} from "./util";
import timer from "./counter";
import counter from "./counter";

const exec = util.promisify(require('child_process').exec)

async function createFirebaseJson() {
    const hosting = {
        "hosting": {
            "public": ".",
            "ignore": [
                "firebase.json",
                "**/.*",
            ]
        }
    }
    try {
        const configDir = `${REPORTS_DIR}/firebase.json`
        await fs.writeFile(configDir, JSON.stringify(hosting), {mode: 0o755, encoding: 'utf-8'})
        return configDir
    } catch (e) {
        console.info(`firebase.json write failed: ${e}`)
        throw e
    }
}

async function changePermissionsRecursively(dirPath: string, mode: fsSync.Mode) {
    await fs.chmod(dirPath, mode);

    const files = await fs.readdir(dirPath);

    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
            await changePermissionsRecursively(fullPath, mode);
        } else {
            await fs.chmod(fullPath, mode);
        }
    }
}

async function publishToFireBaseHosting() {
    if (process.env.DEBUG === 'true') {
        console.warn('DEBUG=true: Skipping live deployment')
        return
    }
    console.log(`Deploying Allure report site...`)
    const builder = new StringBuilder()
    builder.append('firebase hosting:channel:deploy').append(' ')
        .append(`--config ${REPORTS_DIR}/firebase.json`).append(' ')
        .append(`--project ${process.env.FIREBASE_PROJECT_ID}`).append(' ')
        .append('--no-authorized-domains').append(' ')
        .append(websiteId!)

    // Website expiration setup
    builder.append(' ')
        .append('--expires')
        .append(' ')
    const expires = process.env.WEBSITE_EXPIRES
    if (expires && validateWebsiteExpires(expires)) {
        console.log(`WEBSITE_EXPIRES set to ${expires}`)
        builder.append(expires)
    } else {
        console.log('No valid WEBSITE_EXPIRES provided, defaults to 7d')
        builder.append('7d')
    }

    const {stdout, stderr} = await exec(builder.toString())

    if (stderr && !stdout) {
        console.error(`Error from hosting: ${stderr}`)
    }
    // Try to extract
    const regex = /hosting:channel: Channel URL.*\((.*?)\):\s+(https?:\/\/\S+)/;
    const match = stdout.match(regex);

    if (match && match[2]) {
        const url = match[2]
        console.log(`Allure test report URL: ${url}`)
        return url as string
    } else {
        console.warn('Could not parse URL from hosting.')
        console.log(stdout)
        return null
    }

}

export function writeGitHubSummary({summaryPath = '', url = ''}) {

    const summaryContent = `
### Allure Docker Deploy 🚀

**📝 Test Report URL: ${url}**

**📂 Files uploaded: ${counter.filesUploaded}**

**🔍 Files processed: ${counter.filesProcessed}**

**⏱️ Duration: ${timer.getElapsedSeconds()} seconds**
`;
    if (!summaryPath) {
        console.warn('GITHUB_STEP_SUMMARY is not defined. Are you running inside a GitHub Action?');
    }
    try {
        fsSync.writeFileSync(summaryPath, summaryContent, {flag: 'a'}); // Append to the file
        console.log('Summary written to $GITHUB_STEP_SUMMARY');
    } catch (err) {
        console.warn('Failed to write to $GITHUB_STEP_SUMMARY:', err);
    }
}

export async function deploy() {
    await createFirebaseJson()
    // Grant execution permission to website files
    await changePermissionsRecursively(REPORTS_DIR, 0o755)
    return await publishToFireBaseHosting()
}



