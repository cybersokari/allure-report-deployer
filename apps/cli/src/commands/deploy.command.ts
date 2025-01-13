import {Argument, Command, Option} from "commander";
import {db} from "../utilities/database.js";
import process from "node:process";
import {
    getRuntimeDirectory,
    isJavaInstalled,
} from "../utilities/file-util.js";
import path from "node:path";
import {KEY_BUCKET, KEY_PROJECT_ID} from "../utilities/constants.js";
import {ArgsInterface} from "../interfaces/args.interface.js";
import {GoogleCredentialsHelper} from "../utilities/google-credentials-helper.js";
import {
    getGithubConfig,
    parseRetries,
    validateBucket,
    validateCredentials,
    validateResultsPath,
    validateSlackConfig
} from "../utilities/util.js";

const ERROR_MESSAGES = {
    NO_JAVA: 'Error: JAVA_HOME not found. Allure 2.32 requires JAVA runtime installed'
};

const COMMAND_DESCRIPTIONS = {
    RETRIES: "Set the number of previous test runs to show as retries in the upcoming report when Storage 'bucket' is provided",
    SHOW_HISTORY: "Show history in the upcoming report when Storage 'bucket' is provided",
    PREFIX: "The storage bucket path to back up Allure results and history files"
}

// Initialize arguments and options as variables
export const allureResultsPathArg = new Argument("<allure-results-path>", "Path to results, Default 'allure-results'")
    .default("./allure-results")
    .argOptional();
export const reportNameArg = new Argument("<report-name>", "Name of your report. Default is 'Allure Report'")
    .argOptional();
export const retriesOption = new Option("-r, --retries <limit>", COMMAND_DESCRIPTIONS.RETRIES)
    .argParser(parseRetries);
export const showHistoryOption = new Option("-h, --show-history", COMMAND_DESCRIPTIONS.SHOW_HISTORY);
export const gcpJsonOption = new Option("--gcp-json <json-path>", "Path to Firebase/GCP JSON credential");
export const bucketOption = new Option("-b, --bucket <bucket>", "Firebase/GCP Storage bucket");

export const prefixOption = new Option("-p, --prefix <prefix>", COMMAND_DESCRIPTIONS.PREFIX);
export const updatePrOption = new Option("--update-pr <type>", "Update pull request with report URL and info")
    .choices(['summary', 'comment'])
    .default('comment')
    .hideHelp();
export const cleanOption = new Option("-c, --clean", "Delete all live test reports and files in storage bucket before generating report");


async function handleDeployAction(resultPath: any, reportName: any, options: any): Promise<ArgsInterface> {
    try {
        await validateResultsPath(resultPath);
        const firebaseProjectId = await validateCredentials(options.gcpJson);
        validateBucket(options);
        const slackConfig = validateSlackConfig(options.slackChannel, options.slackToken);

        const runtimeDir = await getRuntimeDirectory();
        const retries = options.retries
        const showHistory = options.showHistory

        return {
            prefix: options.prefix,
            runtimeCredentialDir: options.gcpJson || (await new GoogleCredentialsHelper().directory()),
            ARCHIVE_DIR: path.join(runtimeDir, 'archive'),
            HOME_DIR: runtimeDir,
            REPORTS_DIR: path.join(runtimeDir, 'allure-report'),
            deployReport: options.output === undefined, //
            RESULTS_PATH: resultPath,
            RESULTS_STAGING_PATH: path.join(runtimeDir, 'allure-results'),
            downloadRequired: showHistory || retries,
            fileProcessingConcurrency: 10,
            firebaseProjectId: firebaseProjectId || db.get(KEY_PROJECT_ID),
            uploadRequired: showHistory || retries,
            storageBucket: options.bucket || db.get(KEY_BUCKET),
            retries: retries,
            showHistory: showHistory,
            reportName: reportName,
            slackConfig: slackConfig,
            updatePr: options.updatePr,
            clean: options.clean,
            githubConfig: process.env.GITHUB_OUTPUT ? getGithubConfig() : undefined
        }
    } catch (error) {
        // @ts-ignore
        console.error(error.message);
        process.exit(1);
    }
}

export function addDeployCommand(defaultProgram: Command, onCommand: (args: ArgsInterface) => Promise<void>): Command {
    const slackChannelOption = new Option("-sc, --slack-channel <channel>", "Slack channel ID");
    const slackTokenOption = new Option("-st, --slack-token <token>", "Slack token");
    // Add arguments and options to the command
    return defaultProgram
        .command("deploy")
        .description("Generate and deploy report to host provider")
        .addArgument(allureResultsPathArg)
        .addArgument(reportNameArg)
        .addOption(retriesOption)
        .addOption(showHistoryOption)
        .addOption(gcpJsonOption)
        .addOption(bucketOption)
        .addOption(slackChannelOption)
        .addOption(slackTokenOption)
        .addOption(prefixOption)
        .addOption(updatePrOption)
        .addOption(cleanOption)
        .action(async (resultPath, reportName, options) => {
            if (!isJavaInstalled()) {
                console.warn(ERROR_MESSAGES.NO_JAVA);
                process.exit(1);
            }

            const cliArgs = await handleDeployAction(resultPath, reportName, options);
            await onCommand(cliArgs);
        });
}

