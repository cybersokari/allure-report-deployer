import * as fsSync from 'fs'
import * as fs from 'fs/promises'
import * as path from "node:path";
import util from "node:util";

const exec = util.promisify(require('child_process').exec)
import {DEBUG, websiteId} from "../index";
import {StringBuilder} from "./string-builder";
import credential from "./credential";
import ansiEscapes from 'ansi-escapes';
import chalk from "chalk";


export async function* getAllFilesStream(dir: string): AsyncGenerator<string> {
    const entries = await fs.readdir(dir, {withFileTypes: true});
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            yield* getAllFilesStream(fullPath);
        } else {
            yield fullPath;
        }
    }
}

/**
 * Validates the expiration format for the website hosting link.
 * Ensures the format is a number followed by 'h', 'd', or 'w' and is within 30 days.
 * @param expires - The expiration string
 * @returns {boolean} - True if valid, false otherwise
 */
export function validateWebsiteExpires(expires: string): boolean {

    const length = expires.length
    if (length < 2 || length > 3) {
        return false;
    }

    // Regex to validate a format: number followed by h/d/w
    const validFormatRegex = /^(\d+)([hdw])$/;
    const match = expires.match(validFormatRegex);

    if (!match) {
        return false;
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    // Convert to days for comparison
    let days: number;
    switch (unit) {
        case 'h':
            days = value / 24;
            break;
        case 'd':
            days = value;
            break;
        case 'w':
            days = value * 7;
            break;
        default:
            return false;
    }
    return days <= 30
}


export async function changePermissionsRecursively(dirPath: string, mode: fsSync.Mode) {
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

/**
 * Publishes the Allure report website using Firebase Hosting.
 * Configures the hosting setup and deploys the site.
 * @param configParentDir - Directory containing the hosting configuration
 * @returns {Promise<string | undefined>} - The URL of the deployed site, if successful
 */
export async function publishToFireBaseHosting(configParentDir: string): Promise<string| undefined> {
    if (DEBUG) {
        console.warn('DEBUG=true: Skipping live deployment')
        return
    }
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
        await changePermissionsRecursively(configParentDir, 0o755)
        const configDir = `${configParentDir}/firebase.json`
        await fs.writeFile(configDir, JSON.stringify(hosting), {mode: 0o755, encoding: 'utf-8'})
    } catch (e) {
        // Overwrite fail, this is not supposed to happen
        console.info(`Cannot create firebase.json. Aborting deployment ${e}`)
        return
    }

    console.log(`Deploying Allure report site...`)
    const builder = new StringBuilder()
    builder.append('firebase hosting:channel:deploy').append(' ')
        .append(`--config ${configParentDir}/firebase.json`).append(' ')
        .append(`--project ${credential.projectId}`).append(' ')
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

        console.log('Allure test report URL')
        console.log(ansiEscapes.link(chalk.blue(url), url));
        return url as string
    } else {
        console.warn('Could not parse URL from hosting.')
        console.log(stdout)
        return
    }

}








