import * as fsSync from 'fs'
import * as fs from 'fs/promises'
import * as path from "node:path";
import util from "node:util";
import archiver from 'archiver';
import unzipper from 'unzipper';

const exec = util.promisify(require('child_process').exec)
import {DEBUG, websiteId} from "./constant";
import {StringBuilder} from "./string-builder";
import credential from "./credential";

export function appLog(data: string) {
    console.log(data)
}

// export async function* getStreamOfFiles(param: { dir: string, recursive?: boolean }): AsyncGenerator<string> {
//
//     const entries = await fs.readdir(param.dir, {withFileTypes: true});
//     for (const entry of entries) {
//         const fullPath = path.join(param.dir, entry.name);
//         if (param.recursive && entry.isDirectory()) {
//             yield* getStreamOfFiles({dir: fullPath, recursive: true});
//         } else {
//             yield fullPath;
//         }
//     }
// }

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
export async function publishToFireBaseHosting(configParentDir: string): Promise<string | null> {
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
        // console.info(`Cannot create firebase.json. Aborting deployment ${e}`)
        return null;
    }

    // console.log(`Deploying Allure report site...`)
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
        // console.log(`WEBSITE_EXPIRES set to ${expires}`)
        builder.append(expires)
    } else {
        // console.log('No valid WEBSITE_EXPIRES provided, defaults to 7d')
        builder.append('7d')
    }

    if (DEBUG) {
        appLog('DEBUG mode, skipping live deployment')
        return 'http://127.0.0.1:8080/';
    }
    const {stdout, stderr} = await exec(builder.toString())

    if (stderr && !stdout) {
        // console.error(`Error from hosting: ${stderr}`)
        return null;
    }
    // Try to extract
    const regex = /hosting:channel: Channel URL.*\((.*?)\):\s+(https?:\/\/\S+)/;
    const match = stdout.match(regex);

    if (match && match[2]) {
        const url = match[2]
        return url as string
    } else {
        console.warn('Could not parse URL from hosting.')
        console.log(stdout)
        return null
    }

}


// Function to zip a folder
export async function zipFolder(sourceFolder: { path: string, destination?: string }[], outputZipFile: string) {
    return await new Promise((resolve: (value: boolean) => void, reject) => {

        // Ensure the output directory exists
        const outputDir = path.dirname(outputZipFile);
        fsSync.mkdirSync(outputDir, {recursive: true});
        // Create a file stream for the output zip file
        const output = fsSync.createWriteStream(outputZipFile);
        const archive = archiver('zip', {zlib: {level: 9}}); // Set the compression level

        // Listen for errors
        output.on('close', () => {
            resolve(true);
        });
        archive.on('error', (err) => {
            appLog(`Zip file archive error: ${err}`);
            resolve(false);
        });
        // Pipe archive data to the file stream
        archive.pipe(output);
        // Append files/folders to the archive
        for (const folder of sourceFolder) {
            archive.directory(folder.path, folder.destination || false);
        }
        // Finalize the archive
        archive.finalize();
    });
}

export async function unzipFile(zipFilePath: string, outputDir: string) {
    const directory = await unzipper.Open.file(zipFilePath);
    await directory.extract({path: outputDir})
}

export async function countFiles(directory: string[]) {
    let count = 0;
    try {
        for (const dir of directory) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            const files = entries.filter((entry) => entry.isFile());
            count += files.length;
        }
    } catch (err) {
        appLog(`Error reading directory: ${err}`);
    }
    return count
}








