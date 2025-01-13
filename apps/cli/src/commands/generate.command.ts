import {Command, Option} from "commander";
import {ArgsInterface} from "../interfaces/args.interface.js";
import {getRuntimeDirectory, isJavaInstalled} from "../utilities/file-util.js";
import process from "node:process";
import {
    ERROR_MESSAGES,
    getGithubConfig,
    validateBucket,
    validateCredentials,
    validateResultsPath
} from "../utilities/util.js";
import {GoogleCredentialsHelper} from "../utilities/google-credentials-helper.js";
import path from "node:path";
import {db} from "../utilities/database.js";
import {KEY_BUCKET, KEY_PROJECT_ID} from "../utilities/constants.js";
import {
    allureResultsPathArg,
    bucketOption,
    gcpJsonOption, prefixOption,
    reportNameArg,
    retriesOption,
    showHistoryOption, updatePrOption
} from "./deploy.command.js";

async function handleGenerateAction(resultPath: any, reportName: any, options: any): Promise<ArgsInterface> {
    try {
        await validateResultsPath(resultPath);
        const firebaseProjectId = await validateCredentials(options.gcpJson);
        validateBucket(options);
        const runtimeDir = await getRuntimeDirectory();
        const retries = options.retries
        const showHistory = options.showHistory
        return {
            prefix: options.prefix,
            runtimeCredentialDir: options.gcpJson || (await new GoogleCredentialsHelper().directory()),
            ARCHIVE_DIR: path.join(runtimeDir, 'archive'),
            HOME_DIR: runtimeDir,
            REPORTS_DIR: path.normalize(options.output),
            deployReport: false, //
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

export function addGenerateCommand(defaultProgram: Command, onCommand: (args: ArgsInterface) => Promise<void>): Command {
    const outputDirOption = new Option("-o, --output <output-dir>", "The directory to generate Allure report into")
        .default('allure-report')
    // const executorDirOption = new Option("-e, --executor <executor-dir>", "Path to your custom executor.json")
    return defaultProgram.command('generate')
        .description("Generate report to output directory")
        .addArgument(allureResultsPathArg)
        .addArgument(reportNameArg)
        .addOption(retriesOption)
        .addOption(showHistoryOption)
        .addOption(gcpJsonOption)
        .addOption(bucketOption)
        .addOption(prefixOption)
        .addOption(updatePrOption)
        .addOption(outputDirOption)
        .action(async (resultPath, reportName, options) => {
            if (!isJavaInstalled()) {
                console.warn(ERROR_MESSAGES.NO_JAVA);
                process.exit(1);
            }
            const cliArgs = await handleGenerateAction(resultPath, reportName, options);
            await onCommand(cliArgs);
        });
}