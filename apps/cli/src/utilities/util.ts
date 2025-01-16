import * as fsSync from 'fs'
import * as fs from 'fs/promises'
import * as path from "node:path";

import process from "node:process";
import {oraPromise} from "ora";
import {GoogleCredentialsHelper, ServiceAccountJson} from "./google-credentials-helper.js";
import {db} from "./database.js";
import {KEY_BUCKET, KEY_SLACK_CHANNEL, KEY_SLACK_TOKEN} from "./constants.js";
import chalk from "chalk";
import {SlackConfig} from "allure-deployer-shared/dist/interfaces/slack.interface";
import {readJsonFile} from "allure-deployer-shared";


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
    for (const path of paths) {
        const trimmedPath = path.trim(); // Remove any extra spaces
        const exists = await fs.access(trimmedPath)
            .then(() => true)
            .catch(() => false);
        if (exists) {
            validPaths.push(trimmedPath);
        }
    }
    return validPaths;
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


export async function validateCredentials(gcpJsonPath: string | undefined): Promise<string> {
    if (gcpJsonPath) {
        try {
            const serviceAccount = await readJsonFile(gcpJsonPath) as ServiceAccountJson;
            process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpJsonPath;
            return serviceAccount.project_id;
        } catch (e) {
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
    // Return undefined if any is still missing
    if (!channel || !token) {
        return undefined;
    }
    // Return valid SlackConfig
    return {channel, token};
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







