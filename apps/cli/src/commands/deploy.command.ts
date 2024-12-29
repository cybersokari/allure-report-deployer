import {Argument, Command, Option} from "commander";
import {db} from "../utilities/database.js";
import process from "node:process";
import {
    getRuntimeDirectory,
    getSavedCredentialDirectory,
    isJavaInstalled,
    readJsonFile
} from "../utilities/file-util.js";
import fs from "fs/promises";
import path from "node:path";
import {KEY_BUCKET, KEY_PROJECT_ID, KEY_SLACK_CHANNEL, KEY_SLACK_TOKEN} from "../utilities/constants.js";
import chalk from "chalk";
import {ArgsInterface} from "../interfaces/args.interface.js";

const ERROR_MESSAGES = {
    EMPTY_RESULTS: "Error: The specified results directory is empty.",
    NO_RESULTS_DIR: "Error: No Allure result files in the specified directory.",
    MISSING_CREDENTIALS: "Error: Firebase/GCP credentials must be set using 'gcp-json:set' or provided via '--gcp-json'.",
    MISSING_BUCKET: "Storage bucket not provided. History and Retries will not be available in report.",
    INVALID_SLACK_CRED: `Invalid Slack credential. ${chalk.blue('slack_channel')} and ${chalk.blue('slack_token')} must be provided together`,
    NO_JAVA: 'Error: JAVA_HOME not found. Allure 2.32 requires JAVA installed'
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

function validateBucket(options: any): void {
    if (!options.bucket && !db.get(KEY_BUCKET)) {
        if (options.showRetries || options.showHistory) {
            console.warn(ERROR_MESSAGES.MISSING_BUCKET)
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

function validateUpdatePR(value: string): string {
    if(value === 'comment' || value === 'summary') {
        return value
    }
    console.warn(`Invalid value "${value}" for --update-pr. Falling back to "summary".`);
    return 'summary'
}

async function handleAction(resultPath: any, reportName: any, options: any): Promise<ArgsInterface> {
    try {
        await validateResultsPath(resultPath);
        const firebaseProjectId = await getFirebaseCredentials(options.gcpJson);
        validateBucket(options);
        validateSlackCredentials(options.slackChannel, options.slackToken);

        const runtimeDir = await getRuntimeDirectory();
        // Default true if not set
        const showRetries = options.showRetries ?? true
        const showHistory = options.showHistory ?? true
        return {
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
            uploadRequired: showHistory || showRetries,
            storageBucket: options.bucket || db.get(KEY_BUCKET),
            showRetries: showRetries,
            showHistory: showHistory,
            reportName: reportName,
            slack_channel: options.slackChannel || db.get(KEY_SLACK_CHANNEL, undefined),
            slack_token: options.slackToken || db.get(KEY_SLACK_TOKEN, undefined),
            buildUrl: getGitHubBuildUrl(),
            updatePr: options.updatePr
        }
    } catch (error) {
        // @ts-ignore
        console.error(error.message);
        process.exit(1);
    }
}

export function addDeployCommand(defaultProgram: Command, onCommand: (args: ArgsInterface) => Promise<void>): Command {
    return defaultProgram
        .command("deploy")
        .addArgument(new Argument("<allure-results-path>", "Allure results path").default("./allure-results").argOptional())
        .addArgument(new Argument("<report-name>", "Name of your report. Default is 'Allure Report'").argOptional())
        .addOption(new Option("-r, --show-retries", "Show retries in the report"))
        .addOption(new Option("-h, --show-history", "Show history in the report"))
        .addOption(new Option("--gcp-json <json-path>", "Path to Firebase/GCP JSON credential"))
        .addOption(new Option("-b, --bucket <bucket>", "Firebase/GCP Storage bucket"))
        .addOption(new Option("-sc,  --slack-channel <channel>","Slack channel ID"))
        .addOption(new Option("-st,  --slack-token <token>","Slack token"))
        .addOption(new Option("-p, --prefix <prefix>", "The storage bucket path to back up Allure results and history files"))
        .addOption(new Option("--update-pr <type>", "Update pull request with report url and info")
            .default('comment', 'summary/comment').hideHelp().argParser(validateUpdatePR))
        .action(async (resultPath, reportName, options) => {
            if (!isJavaInstalled()) {
                console.warn(ERROR_MESSAGES.NO_JAVA)
                process.exit(1)
            }
            const cliArgs = await handleAction(resultPath, reportName, options);
            await onCommand(cliArgs);
        });
}