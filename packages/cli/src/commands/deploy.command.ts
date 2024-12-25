import { Argument, Command, Option } from "commander";
import {db} from "../utils/database.js";
import process from "node:process";
import { getRuntimeDirectory, getSavedCredentialDirectory, readJsonFile } from "../utils/file-util.js";
import { CliArguments } from "../utils/cli-arguments.js";
import fs from "fs/promises";
import path from "node:path";
import {KEY_BUCKET, KEY_PROJECT_ID, KEY_SLACK_CHANNEL, KEY_SLACK_TOKEN} from "../utils/constants.js";
import chalk from "chalk";

const ERROR_MESSAGES = {
    EMPTY_RESULTS: "Error: The specified results directory is empty.",
    NO_RESULTS_DIR: "Error: No Allure result files in the specified directory.",
    MISSING_CREDENTIALS: "Error: Firebase/GCP credentials must be set using 'gcp-json:set' or provided via '--gcp-json'.",
    MISSING_BUCKET: "Error: A Firebase/GCP bucket must be set using 'bucket:set' or provided via '--bucket'.",
    MISSING_WEBSITE_ID: "Error: The 'website-id' argument or '--bucket' option is required.",
    INVALID_SLACK_CRED: `Invalid Slack credential. ${chalk.blue('slack_channel')} and ${chalk.blue('slack_token')} must be provided together`,
};

async function validateResultsPath(resultPath: string): Promise<void> {
    let files = []
    try {
        files = await fs.readdir(path.normalize(resultPath));
    } catch {
        throw new Error(ERROR_MESSAGES.NO_RESULTS_DIR);
    }
    if (!files.length) {
        throw new Error(ERROR_MESSAGES.EMPTY_RESULTS);
    }
}

async function getFirebaseCredentials(gcpJson: string | undefined): Promise<string> {
    if (gcpJson) {
        const json = await readJsonFile(gcpJson); // Throws an error for invalid files
        process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpJson;
        return json.project_id;
    }

    const savedCredentials = await getSavedCredentialDirectory();
    if (!savedCredentials) {
        throw new Error(ERROR_MESSAGES.MISSING_CREDENTIALS);
    }

    process.env.GOOGLE_APPLICATION_CREDENTIALS = savedCredentials;
    return "";
}

function validateBucket(options: any, websiteId: string): void {
    if (!options.bucket && !db.get(KEY_BUCKET)) {
        if (options.showRetries || options.showHistory || options.keepHistory || options.keepResults) {
            throw new Error(ERROR_MESSAGES.MISSING_BUCKET);
        }
        if (!websiteId) {
            throw new Error(ERROR_MESSAGES.MISSING_WEBSITE_ID);
        }
    }
}

function validateSlackCredentials(channel: any, token: any): void {
    if(channel === undefined && token === undefined) return
    if(!channel || !token){
        throw new Error(ERROR_MESSAGES.INVALID_SLACK_CRED);
    }
}

function getGitHubBuildUrl(): string|undefined {
    const repo = process.env.GITHUB_REPOSITORY
    const runId = process.env.GITHUB_RUN_ID
    if(repo && runId){
        return `https://github.com/${repo}/actions/runs/${runId}`
    }
    return undefined
}

export function addDeployCommand(defaultProgram: Command, onCommand: (args: CliArguments) => Promise<void>) {
    defaultProgram
        .command("deploy")
        .description("Generate and deploy Allure report")
        .addArgument(new Argument("<allure-results-path>", "Allure results path").default("./allure-results").argOptional())
        .addArgument(new Argument("<report-id>", "Unique identifier for the report").default("default").argOptional())
        .addOption(new Option("-kh, --keep-history", "Upload history to enable report history"))
        .addOption(new Option("-kr, --keep-results", "Upload results to enable retries"))
        .addOption(new Option("-r, --show-retries", "Show retries in the report"))
        .addOption(new Option("-h, --show-history", "Show history in the report"))
        .addOption(new Option("--gcp-json <json-path>", "Path to Firebase/GCP JSON credential"))
        .addOption(new Option("-b, --bucket <bucket>", "Firebase/GCP Storage bucket"))
        .addOption(new Option("-sc,  --slack-channel <channel>","Slack channel ID"))
        .addOption(new Option("-st,  --slack-token <token>","Slack token"))
        .addOption(new Option("-p, --prefix <prefix>", "The storage bucket path to back up Allure results and history files"))
        .action(async (resultPath, reportId, options) => {
            try {
                await validateResultsPath(resultPath);
                const firebaseProjectId = await getFirebaseCredentials(options.gcpJson);
                validateBucket(options, reportId);
                validateSlackCredentials(options.slackChannel, options.slackToken);

                const runtimeDir = await getRuntimeDirectory();
                // Default true if not set
                const keepHistory = options.keepHistory ?? true
                const keepResults = options.keepResults ?? true
                const showRetries = options.showRetries ?? true
                const showHistory = options.showHistory ?? true
                const cliArgs: CliArguments = {
                    prefix: options.prefix,
                    runtimeCredentialDir: options.gcpJson || (await getSavedCredentialDirectory()),
                    ARCHIVE_DIR: `${runtimeDir}/archive`,
                    HOME_DIR: runtimeDir,
                    REPORTS_DIR: `${runtimeDir}/allure-report`,
                    RESULTS_PATH: resultPath,
                    RESULTS_STAGING_PATH: `${runtimeDir}/allure-results`,
                    downloadRequired: showHistory || showRetries,
                    fileProcessingConcurrency: 10,
                    firebaseProjectId: firebaseProjectId || db.get(KEY_PROJECT_ID),
                    uploadRequired: keepHistory || keepResults,
                    storageBucket: options.bucket || db.get(KEY_BUCKET),
                    keepHistory: keepHistory,
                    keepResults: keepResults,
                    showRetries: showRetries,
                    showHistory: showHistory,
                    reportId: reportId,
                    slack_channel: options.slackChannel || db.get(KEY_SLACK_CHANNEL, undefined),
                    slack_token: options.slackToken || db.get(KEY_SLACK_TOKEN, undefined),
                    buildUrl: getGitHubBuildUrl()
                };

                await onCommand(cliArgs);
            } catch (error) {
                // @ts-ignore
                console.error(error.message);
                process.exit(1);
            }
        });
}