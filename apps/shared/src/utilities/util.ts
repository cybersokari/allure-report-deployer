import * as fsSync from 'fs'
import * as fs from 'fs/promises'
import * as path from "node:path";
import archiver from 'archiver';

import {StringBuilder} from "./string-builder.js";
import {ReportStatistic} from "../interfaces/counter.interface.js";
import {readJsonFile} from "./file-util.js";
import chalk from "chalk";


export const ERROR_MESSAGES = {
    EMPTY_RESULTS: "Error: The specified results directory is empty.",
    NO_RESULTS_DIR: "Error: No Allure result files in the specified directory.",
    MISSING_CREDENTIALS: "Error: Firebase/GCP credentials must be set using 'gcp-json:set' or provided via '--gcp-json'.",
    MISSING_BUCKET: "Storage bucket not provided. History and Retries will not be available in report.",
    INVALID_SLACK_CRED: `Invalid Slack credential. ${chalk.blue('slack_channel')} and ${chalk.blue('slack_token')} must be provided together`,
    NO_JAVA: 'Error: JAVA_HOME not found. Allure 2.32 requires JAVA runtime installed'
};

export function appLog(data: string) {
    console.log(data)
}


export async function changePermissionsRecursively(dirPath: string, mode: fsSync.Mode, maxDepth: number = 1) {
    // Change for the current depth
    await fs.chmod(dirPath, mode);

    if (maxDepth < 1) return

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


export async function archiveFilesInDirectories(
    {source, outputFilePath, exclude = []}: {
        source: { path: string; destination?: string }[],
        outputFilePath: string,
        exclude?: string[]
    }
): Promise<string> {
    return await new Promise((resolve: (value: string) => void, reject) => {
        // Ensure the output directory exists
        const outputDir = path.dirname(outputFilePath);
        fsSync.mkdirSync(outputDir, {recursive: true});

        // Create a file stream for the output zip file
        const output = fsSync.createWriteStream(outputFilePath);
        const archive = archiver('zip', {zlib: {level: 9}}); // Set the compression level

        output.on('close', () => {
            resolve(outputFilePath);
        });
        archive.on('error', (err) => {
            console.error(`Zip file archive error: ${err}`);
            reject(undefined);
        });

        // Pipe archive data to the file stream
        archive.pipe(output);

        // Append files/folders to the archive, excluding specified patterns
        for (const folder of source) {
            archive.glob('**/*', {
                cwd: folder.path,
                ignore: exclude, // Exclude patterns
                dot: true, // Include hidden files
            }, {prefix: folder.destination || undefined});
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
    return !!filePath.match(/^.*\.(jsonl|json|png|jpeg|jpg|gif|properties|log|webm|html|mp4)$/i)
}

/**
 * Validates and filters the file paths from a comma-separated string.
 *
 * @param commaSeparatedResultPaths - A string containing file paths separated by commas.
 * @returns A Promise resolving to an array of valid file paths that exist on the filesystem.
 */
export async function validateResultsPaths(commaSeparatedResultPaths: string): Promise<string[]> {
    // If the input does not contain commas, return it as a single-element array
    if (!commaSeparatedResultPaths.includes(',')) {
        const exists = await fs.access(commaSeparatedResultPaths)
            .then(() => true)
            .catch(() => false);
        return exists ? [commaSeparatedResultPaths] : [];
    }
    // Split the string into an array of paths and filter only existing paths
    const paths = commaSeparatedResultPaths.split(',');
    const validPaths: string[] = [];
    const promises  = [];
    for (const path of paths) {
        promises.push(async () => {
            const trimmedPath = path.trim(); // Remove any extra spaces
            const exists = await fs.access(trimmedPath)
                .then(() => true)
                .catch(() => false);
            if (exists) {
                validPaths.push(trimmedPath);
            }
        })
    }
    await Promise.all(promises);
    return validPaths;
}

export async function getReportStats(reportDir: string): Promise<ReportStatistic> {
    const summaryJson = await readJsonFile(path.join(reportDir, "widgets/summary.json"))
    return summaryJson.statistic as ReportStatistic;
}

export function getDashboardUrl({projectId, storageBucket}: {
    projectId: string,
    storageBucket: string
}): string {
    return new StringBuilder()
        .append("https://console.firebase.google.com/project")
        .append(`/${(projectId)}`)
        .append(`/storage/${storageBucket}/files`).toString()
}






