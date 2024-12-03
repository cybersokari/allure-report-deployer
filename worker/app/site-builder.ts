import {REPORTS_DIR} from "./report-builder";
import * as fs from "fs/promises";
import {StringBuilder} from "./string-builder";
import * as fsSync from "fs";
import * as path from "node:path";
import * as util from 'node:util'
const exec = util.promisify(require('child_process').exec)

async function createFirebaseJson(site: string) {
    const hosting = {
        "hosting": {
            "public": ".",
            "site": site,
            "ignore": [
                "firebase.json",
                "**/.*",
            ]
        }
    }
    try {
        const configDir = `${REPORTS_DIR}/firebase.json`
        await fs.writeFile(configDir, JSON.stringify(hosting), {mode: 0o755, encoding: 'utf-8'} )
        return configDir
    }catch (e) {
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
    if(process.env.DEBUG) {
        console.warn('Skipping deployment because to DEBUG set to true')
        return
    }
    console.log(`Deploying to Firebase...`)
    const builder = new StringBuilder()
    builder.append('firebase deploy').append(' ')
        .append(`--config ${REPORTS_DIR}/firebase.json`).append(' ')
        .append(`--project ${process.env.FIREBASE_SITE_ID ?? process.env.FIREBASE_PROJECT_ID!}`)
    const {stdout} = await exec(builder.toString())
    console.log(stdout)
}

export async function deploy ()  {
    await createFirebaseJson(process.env.FIREBASE_SITE_ID ?? process.env.FIREBASE_PROJECT_ID!)
    await changePermissionsRecursively(REPORTS_DIR, 0o755)
    await publishToFireBaseHosting()
}

