import * as fsSync from 'fs'
import * as fs from 'fs/promises'
import * as path from "node:path";
import archiver from 'archiver';
import unzipper, {Entry} from 'unzipper';

import {DEBUG, keepHistory, keepResults, showHistory, showRetries, STORAGE_BUCKET, websiteId} from "./constant";

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

export async function unzipAllureResult(zipFilePath: string, outputDir: string): Promise<boolean> {
    return await new Promise((resolve, reject) => {
        fsSync.createReadStream(zipFilePath)
            .pipe(unzipper.Parse())
            .on('entry', async (entry: Entry) => {
                const fullPath = path.join(outputDir, entry.path);
                if (!showHistory) {
                    // Ignore the history subdirectory
                    if (entry.path.includes('history/')) {
                        entry.autodrain();
                        return;
                    }
                }
                if (!showRetries) {
                    if (!entry.path.includes('history/')) {
                        entry.autodrain();
                        return;
                    }
                }
                if (isFileTypeAllure(entry.path)) {
                    entry.pipe(fsSync.createWriteStream(fullPath));
                } else {
                    entry.autodrain();
                }
            })
            .on('close', () => {
                resolve(true);
            })
            .on('error', (err) => {
                console.error('Unzip file error:', err);
                resolve(false);
            });
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

export function dashboardUrl(): string | undefined {
    if(!STORAGE_BUCKET) return undefined
    if (DEBUG) {
        return `http://127.0.0.1:4000/storage/${STORAGE_BUCKET}`
    }
    return new StringBuilder()
        .append("https://console.firebase.google.com/project")
        .append(`/${(credential.projectId)}`)
        .append(`/storage/${STORAGE_BUCKET}/files`)
        .toString()
}

/**
 * Prints stats about the report generation process, including
 * history retention and retries.
 */
export function printStats() {
    if (!websiteId) {
        appLog('Report publishing disabled because WEBSITE_ID is not provided');
    }
    if (STORAGE_BUCKET) {
        if (keepHistory && keepResults) {
            appLog(`KEEP_HISTORY and KEEP_RESULTS enabled`)
        } else if (keepHistory) {
            appLog(`KEEP_HISTORY enabled`)
        } else if (keepResults) {
            appLog(`KEEP_RESULTS enabled`)
        }
    } else {
        appLog('STORAGE_BUCKET is not provided, KEEP_HISTORY and KEEP_RESULTS disabled')
    }
}






