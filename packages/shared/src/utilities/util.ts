import * as fsSync from 'fs'
import * as fs from 'fs/promises'
import * as path from "node:path";
import archiver from 'archiver';

import {StringBuilder} from "./string-builder.js";
import {ArgsInterface} from "../interfaces/args.interface.js";
export function appLog(data: string) {
    console.log(data)
}


export async function changePermissionsRecursively(dirPath: string, mode: fsSync.Mode, maxDepth: number = 1) {
    // Change for the current depth
    await fs.chmod(dirPath, mode);

    if(maxDepth < 1) return

    const files = await fs.readdir(dirPath);

    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
            await changePermissionsRecursively(fullPath, mode, maxDepth - 1);
        } else {
            await fs.chmod(fullPath, mode);
        }
    }
}


export async function zipFolder(sourceFolder: { path: string, destination?: string }[], outputZipFile: string) {
    return await new Promise((resolve: (value: boolean) => void, reject) => {

        // Ensure the output directory exists
        const outputDir = path.dirname(outputZipFile);
        fsSync.mkdirSync(outputDir, {recursive: true});
        // Create a file stream for the output zip file
        const output = fsSync.createWriteStream(outputZipFile);
        const archive = archiver('zip', {zlib: {level: 9}}); // Set the compression level

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

export async function countFiles(directory: string[]) {
    let count = 0;
    try {
        for (const dir of directory) {
            const entries = await fs.readdir(dir, {withFileTypes: true});
            const files = entries.filter((entry) => entry.isFile());
            count += files.length;
        }
    } catch (err) {
        appLog(`Error reading directory: ${err}`);
    }
    return count
}

export function isFileTypeAllure(filePath: string) {
    return !!filePath.match(/^.*\.(json|png|jpeg|jpg|gif|properties|log|webm)$/i)
}

export function getDashboardUrl({projectId, storageBucket}:{projectId?: string, storageBucket: string}): string {
    if (!projectId) {
        return `http://127.0.0.1:4000/storage/${storageBucket}`
    }
    return new StringBuilder()
        .append("https://console.firebase.google.com/project")
        .append(`/${(projectId)}`)
        .append(`/storage/${storageBucket}/files`)
        .toString()
}

/**
 * Prints stats about the report generation process, including
 * history retention and retries.
 */
export function printStats(args: ArgsInterface) {
    if (!args.reportId) {
        appLog('Report publishing disabled because WEBSITE_ID is not provided');
    }
    if (args.storageBucket) {
        if (args.keepHistory && args.keepResults) {
            appLog(`KEEP_HISTORY and KEEP_RESULTS enabled`)
        } else if (args.keepHistory) {
            appLog(`KEEP_HISTORY enabled`)
        } else if (args.keepResults) {
            appLog(`KEEP_RESULTS enabled`)
        }
    } else {
        appLog('STORAGE_BUCKET is not provided, KEEP_HISTORY and KEEP_RESULTS disabled')
    }
}






