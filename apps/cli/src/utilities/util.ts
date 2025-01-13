import * as fsSync from 'fs'
import * as fs from 'fs/promises'
import * as path from "node:path";
import archiver from 'archiver';

import {StringBuilder} from "./string-builder.js";
import process from "node:process";
import {oraPromise} from "ora";
import {ReportStatistic} from "../interfaces/counter.interface.js";
import {readJsonFile} from "./file-util.js";
import {GoogleCredentialsHelper, ServiceAccountJson} from "./google-credentials-helper.js";
import {db} from "./database.js";
import {KEY_BUCKET, KEY_SLACK_CHANNEL, KEY_SLACK_TOKEN} from "./constants.js";
import {SlackConfig} from "../interfaces/slack.interface.js";
import chalk from "chalk";
import {GithubConfig} from "../interfaces/github.interface.js";


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


export async function archiveDirectoryFiles(
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
    return !!filePath.match(/^.*\.(json|png|jpeg|jpg|gif|properties|log|webm|html|mp4)$/i)
}

export async function getReportStats(summaryJsonDir: string): Promise<ReportStatistic> {
    const summaryJson = await readJsonFile(summaryJsonDir)
    return summaryJson.statistic as ReportStatistic;
}

export function getDashboardUrl({projectId, storageBucket}: { projectId?: string, storageBucket: string }): string {
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

export async function validateResultsPath(resultPath: string): Promise<void> {
    let files = []
    try {
        files = await fs.readdir(path.normalize(resultPath));
    } catch {
        console.error(ERROR_MESSAGES.NO_RESULTS_DIR)
        process.exit(1)
    }
    if (!files.length) {
        console.error(ERROR_MESSAGES.EMPTY_RESULTS)
        process.exit(1)
    }
}

export async function validateCredentials(gcpJsonPath: string | undefined): Promise<string> {
    if (gcpJsonPath) {
        try {
            const serviceAccount = await readJsonFile(gcpJsonPath) as ServiceAccountJson;
            process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpJsonPath;
            return serviceAccount.project_id;
        }catch (e) {
            console.error(e);
            process.exit(1)
        }
    } else {
        const credHelper = new GoogleCredentialsHelper();
        const serviceAccount = await credHelper.data();
        if (!serviceAccount) {
            console.error(ERROR_MESSAGES.MISSING_CREDENTIALS);
            process.exit(1)
        }
        process.env.GOOGLE_APPLICATION_CREDENTIALS = await credHelper.directory();
        return serviceAccount.project_id;
    }
}

export function validateBucket(options: any): void {
    if (!options.bucket && !db.get(KEY_BUCKET)) {
        if (options.showRetries || options.showHistory) {
            console.warn(ERROR_MESSAGES.MISSING_BUCKET)
        }
    }
}

export function validateSlackConfig(channel?: string, token?: string): SlackConfig | undefined {
    // Check if only one of the variables is provided
    if ((channel && !token) || (!channel && token)) {
        console.error(ERROR_MESSAGES.INVALID_SLACK_CRED);
        process.exit(1); // Exit if partial inputs are provided
    }
    // Retrieve from database if not provided
    if (!channel) {
        channel = db.get(KEY_SLACK_CHANNEL);
    }
    if (!token) {
        token = db.get(KEY_SLACK_TOKEN);
    }
    // Validate presence of both channel and token after fallback
    if (!channel || !token) {
        console.error(ERROR_MESSAGES.INVALID_SLACK_CRED);
        process.exit(1); // Exit if both are still missing
    }
    // Return valid SlackConfig
    return { channel, token };
}

export function parseRetries(value: string): any {
    if (value.toLowerCase() == 'true') {
        return 5
    }
    if (value.toLowerCase() == 'false') {
        return 0
    }
    if (isNaN(Number(value))) {
        console.error('Error: retries must be a positive number')
        process.exit(1)
    }
    const numberValue = Number(value);
    if (numberValue <= 0) {
        return undefined
    }
    return value
}

export function getGithubConfig(): GithubConfig {
    const [OWNER, REPO] = process.env.GITHUB_REPOSITORY!.split('/')
    const STEP_SUMMARY_PATH = process.env.GITHUB_STEP_SUMMARY!;
    const OUTPUT_PATH = process.env.GITHUB_OUTPUT!;
    const TOKEN = process.env.GITHUB_TOKEN;
    const RUN_ID = process.env.GITHUB_RUN_ID!;
    return {REPO, OWNER, STEP_SUMMARY_PATH, OUTPUT_PATH, RUN_ID, TOKEN}
}





