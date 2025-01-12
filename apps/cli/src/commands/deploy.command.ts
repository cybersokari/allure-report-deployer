import {Argument, Command, Option} from "commander";
import {db} from "../utilities/database.js";
import process from "node:process";
import {
    getRuntimeDirectory,
    isJavaInstalled,
    readJsonFile
} from "../utilities/file-util.js";
import fs from "fs/promises";
import path from "node:path";
import {KEY_BUCKET, KEY_PROJECT_ID, KEY_SLACK_CHANNEL, KEY_SLACK_TOKEN} from "../utilities/constants.js";
import chalk from "chalk";
import {ArgsInterface} from "../interfaces/args.interface.js";
import {GoogleCredentialsHelper, ServiceAccountJson} from "../utilities/google-credentials-helper.js";

const ERROR_MESSAGES = {
    EMPTY_RESULTS: "Error: The specified results directory is empty.",
    NO_RESULTS_DIR: "Error: No Allure result files in the specified directory.",
    MISSING_CREDENTIALS: "Error: Firebase/GCP credentials must be set using 'gcp-json:set' or provided via '--gcp-json'.",
    MISSING_BUCKET: "Storage bucket not provided. History and Retries will not be available in report.",
    INVALID_SLACK_CRED: `Invalid Slack credential. ${chalk.blue('slack_channel')} and ${chalk.blue('slack_token')} must be provided together`,
    NO_JAVA: 'Error: JAVA_HOME not found. Allure 2.32 requires JAVA installed'
};

const COMMAND_DESCRIPTIONS = {
    RETRIES: "Set the number of previous test runs to show as retries in the upcoming report when Storage 'bucket' is provided",
    SHOW_HISTORY: "Show history in the upcoming report when Storage 'bucket' is provided",
    PREFIX: "The storage bucket path to back up Allure results and history files"
}

async function validateResultsPath(resultPath: string): Promise<void> {
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
        console.error(ERROR_MESSAGES.INVALID_SLACK_CRED);
        process.exit(1)
    }
}

function createGitHubBuildUrl(): string|undefined {
    const repo = process.env.GITHUB_REPOSITORY
    const runId = process.env.GITHUB_RUN_ID
    if(repo && runId){
        return `https://github.com/${repo}/actions/runs/${runId}`
    }
    return undefined
}

function parseShowRetries(value: string): any {
    if(value.toLowerCase() == 'true'){
        return 5
    }
    if(value.toLowerCase() == 'false'){
        return 0
    }
    if(isNaN(Number(value))) {
        console.error('Error: retries must be a positive number')
        process.exit(1)
    }
    const numberValue = Number(value);
    if(numberValue <= 0){
        return undefined
    }
    return value
}

async function handleDeployAction(resultPath: any, reportName: any, options: any): Promise<ArgsInterface> {
    try {
        await validateResultsPath(resultPath);
        const firebaseProjectId = await validateCredentials(options.gcpJson);
        validateBucket(options);
        validateSlackCredentials(options.slackChannel, options.slackToken);

        const runtimeDir = await getRuntimeDirectory();
        // Default true if not set
        const retries = options.retries
        const showHistory = options.showHistory
        console.log(`Show history: ${options.showHistory}`);
        console.log(`Show retries: ${options.retries}`);
        return {
            prefix: options.prefix,
            runtimeCredentialDir: options.gcpJson || (await new GoogleCredentialsHelper().directory()),
            ARCHIVE_DIR: `${runtimeDir}/archive`,
            HOME_DIR: runtimeDir,
            REPORTS_DIR: `${runtimeDir}/allure-report`,
            RESULTS_PATH: resultPath,
            RESULTS_STAGING_PATH: `${runtimeDir}/allure-results`,
            downloadRequired: showHistory || retries,
            fileProcessingConcurrency: 10,
            firebaseProjectId: firebaseProjectId || db.get(KEY_PROJECT_ID),
            uploadRequired: showHistory || retries,
            storageBucket: options.bucket || db.get(KEY_BUCKET),
            retries: retries,
            showHistory: showHistory,
            reportName: reportName,
            slack_channel: options.slackChannel || db.get(KEY_SLACK_CHANNEL, undefined),
            slack_token: options.slackToken || db.get(KEY_SLACK_TOKEN, undefined),
            buildUrl: createGitHubBuildUrl(),
            updatePr: options.updatePr,
            clean: options.clean,
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
        .addArgument(new Argument("<allure-results-path>", "path to results, Default 'allure-results'").default("./allure-results").argOptional())
        .addArgument(new Argument("<report-name>", "Name of your report. Default is 'Allure Report'").argOptional())
        .addOption(new Option("-r, --retries <limit>", COMMAND_DESCRIPTIONS.RETRIES).argParser(parseShowRetries))
        .addOption(new Option("-h, --show-history", COMMAND_DESCRIPTIONS.SHOW_HISTORY))
        .addOption(new Option("--gcp-json <json-path>", "Path to Firebase/GCP JSON credential"))
        .addOption(new Option("-b, --bucket <bucket>", "Firebase/GCP Storage bucket"))
        .addOption(new Option("-sc,  --slack-channel <channel>","Slack channel ID"))
        .addOption(new Option("-st,  --slack-token <token>","Slack token"))
        .addOption(new Option("-p, --prefix <prefix>", COMMAND_DESCRIPTIONS.PREFIX))
        .addOption(new Option("--update-pr <type>", "Update pull request with report url and info")
            .choices(['summary','comment'])
            .default('comment').hideHelp())
        .addOption(new Option("-c, --clean", "Delete all live test reports and files in storage bucket before generating report"))
        .action(async (resultPath, reportName, options) => {
            if (!isJavaInstalled()) {
                console.warn(ERROR_MESSAGES.NO_JAVA)
                process.exit(1)
            }
            const cliArgs = await handleDeployAction(resultPath, reportName, options);
            await onCommand(cliArgs);
        });
}