import * as fs from "fs/promises";
import {StringBuilder} from "./string-builder";
import * as fsSync from "fs";
import * as path from "node:path";
import * as util from 'node:util'
import {REPORTS_DIR, websiteId} from "../index";
import {validateWebsiteExpires} from "./util";

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
    } else {
        console.warn('Could not parse URL from hosting.')
        console.log(stdout)
    }
}

export async function deploy() {
    await createFirebaseJson()
    // Grant execution permission to website files
    await changePermissionsRecursively(REPORTS_DIR, 0o755)
    await publishToFireBaseHosting()
}



