import * as fsSync from 'fs'
import * as fs from 'fs/promises'
import * as path from "node:path";
import archiver from 'archiver';

import {StringBuilder} from "./string-builder.js";
import process from "node:process";
import {oraPromise} from "ora";
import {ReportStatistic} from "../interfaces/counter.interface.js";
import {readJsonFile} from "./file-util.js";
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


export async function zipFolder(sourceFolder: { path: string, destination?: string }[], outputZipFile: string): Promise<string> {
    return await new Promise((resolve: (value: string) => void, reject) => {

        // Ensure the output directory exists
        const outputDir = path.dirname(outputZipFile);
        fsSync.mkdirSync(outputDir, {recursive: true});
        // Create a file stream for the output zip file
        const output = fsSync.createWriteStream(outputZipFile);
        const archive = archiver('zip', {zlib: {level: 9}}); // Set the compression level

        output.on('close', () => {
            resolve(outputZipFile);
        });
        archive.on('error', (err) => {
            appLog(`Zip file archive error: ${err}`);
            reject(undefined);
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
    return !!filePath.match(/^.*\.(json|png|jpeg|jpg|gif|properties|log|webm|html|mp4)$/i)
}

export async function getReportStats(summaryJsonDir: string): Promise<ReportStatistic> {
    const summaryJson = await readJsonFile(summaryJsonDir)
    return summaryJson.statistic as ReportStatistic;
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

export interface WithOraParams<T> {
    start: string;
    success: string;
    work: () => Promise<T>;
}
export async function withOra<T>({start, success, work}: WithOraParams<T>): Promise<T> {
    if (process.env.CI) {
        // Plain logging for CI
        console.log(start);
        const result = await work();
        console.log(success);
        return result;
    } else {
        // Use ora when not running in a CI
        return await oraPromise(work, {
            text: start,
            successText: success,
        });
    }
}





