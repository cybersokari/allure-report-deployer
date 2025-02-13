import * as process from "node:process";
// Import necessary modules and commands for the main program functionality
import {
    Allure,
    ArgsInterface,
    ConsoleNotifier,
    GoogleStorageService,
    getDashboardUrl,
    Notifier,
    SlackService,
    SlackNotifier,
    GoogleStorage,
    getReportStats,
    ExecutorInterface,
    NotifyHandler,
    ReportStatistic,
    readJsonFile,
    copyFiles,
    AllureConfig, GoogleStorageConfig
} from "allure-deployer-shared";
import {Command} from "commander";
import {addDeployCommand} from "./commands/deploy.command.js";
import {addCredentialsCommand} from "./commands/credentials.command.js";
import {addStorageBucketCommand} from "./commands/storage.command.js";
import {addVersionCommand} from "./commands/version.command.js";
import {addSlackTokenCommand} from "./commands/slack-setup.command.js";
import {Storage as GCPStorage} from '@google-cloud/storage'
import {addCleanCommand} from "./commands/clean.command.js";
import {addGenerateCommand} from "./commands/generate.command.js";
import {withOra} from "./utilities/util.js";

// Entry point for the application
export function main() {
    const program = new Command();
    (async () => {
        setupCommands(program); // Configure CLI commands
        await program.parseAsync(process.argv); // Parse command-line arguments
    })();
}

// Configures available CLI commands
function setupCommands(program: Command) {
    const deployCommand = addDeployCommand(program, runDeploy); // Adds deploy command
    const generateCommand = addGenerateCommand(program, runGenerate);
    addVersionCommand(program); // Adds version command
    addCredentialsCommand(program); // Adds credentials management command
    addStorageBucketCommand(program); // Adds storage bucket management command
    addSlackTokenCommand(program); // Adds Slack setup command
    addCleanCommand(program);
    program.action(() => {
        program.outputHelp({error: false}); // Displays help if no command is provided
        printCommandHelp("\n Command: deploy", deployCommand);
        printCommandHelp("\n Command: generate", generateCommand);
    });
}

function printCommandHelp(title: string, command: Command) {
    console.log(`\n ${title}`);
    // Capture the help output of deployCommand
    const helpOutput = command.helpInformation();
    // Add indentation to each line of the help output
    const indentedHelpOutput = helpOutput
        .split("\n") // Split into lines
        .map(line => `  ${line}`) // Add two spaces to each line
        .join("\n"); // Join the lines back together
    console.log(indentedHelpOutput); // Print the indented help output
}

async function runGenerate(args: ArgsInterface): Promise<void> {
    try {
        const storage = await initializeCloudStorage(args); // Initialize storage bucket
        await setupStaging(args, storage);
        const allure = getAllure(args)
        await generateReport({allure, args}); // Generate Allure report
        const [resultsStats] = await finalize({storage, args}); // Deploy report and artifacts
        await notify(args, resultsStats); // Send deployment notifications
    } catch (error) {
        console.error("Deployment failed:", error);
        process.exit(1); // Exit with error code
    }
}

function getAllure(args: ArgsInterface): Allure {
    const config: AllureConfig = {
        RESULTS_STAGING_PATH: args.RESULTS_STAGING_PATH,
        REPORTS_DIR: args.REPORTS_DIR,
        reportLanguage: args.reportLanguage
    }
    return new Allure({config})
}

// Executes the deployment process
async function runDeploy(args: ArgsInterface) {
    try {
        const storage = await initializeCloudStorage(args); // Initialize storage bucket
        const [reportUrl] = await setupStaging(args, storage);
        const allure = getAllure(args)
        await generateReport({allure, reportUrl, args}); // Generate Allure report
        const [resultsStats] = await finalize({args, storage}); // Deploy report and artifacts
        await notify(args, resultsStats, reportUrl, allure.environments); // Send deployment notifications
    } catch (error) {
        console.error("Deployment failed:", error);
        process.exit(1); // Exit with error code
    }
}

// Initializes cloud storage and verifies the bucket existence
async function initializeCloudStorage(args: ArgsInterface): Promise<GoogleStorage | undefined> {
    if (!args.storageBucket) return undefined;
    try {
        const credentials = await readJsonFile(args.runtimeCredentialDir);
        const bucket = new GCPStorage({credentials}).bucket(args.storageBucket);
        const [exists] = await bucket.exists();
        if (!exists) {
            console.log(`Storage Bucket '${args.storageBucket}' does not exist. History and Retries will be disabled`);
            return undefined;
        }
        let config: GoogleStorageConfig = {
            ARCHIVE_DIR: args.ARCHIVE_DIR,
            RESULTS_PATHS: args.RESULTS_PATHS,
            REPORTS_DIR: args.REPORTS_DIR,
            RESULTS_STAGING_PATH: args.RESULTS_STAGING_PATH,
            fileProcessingConcurrency: args.fileProcessingConcurrency,
            showHistory: args.showHistory ?? false,
            retries: args.retries ?? 0,
            clean: args.clean?? false,
        }
        return new GoogleStorage(new GoogleStorageService(bucket, args.prefix), config);
    } catch (error) {
        handleStorageError(error);
        throw error;
    }
}

// Prepares files and configurations for deployment
async function setupStaging(args: ArgsInterface, storage?: GoogleStorage) {
    const copyResultsFiles = (async (): Promise<number> => {
        return await copyFiles({
            from: args.RESULTS_PATHS,
            to: args.RESULTS_STAGING_PATH,
            concurrency: args.fileProcessingConcurrency
        })
    })
    return await withOra({
        work: () => Promise.all([
            args.host?.init(args.clean), // Initialize Firebase hosting site
            copyResultsFiles(),
            args.downloadRequired ? storage?.stageFilesFromStorage() : undefined, // Prepare cloud storage files
        ]),
        start: 'Staging files...',
        success: 'Files staged successfully.',
    });
}

// Generates the Allure report with metadata
async function generateReport({allure, reportUrl, args}: {
    allure: Allure,
    reportUrl?: string,
    args: ArgsInterface
}): Promise<string> {
    const executor = args.host ? createExecutor({reportUrl, reportName: args.reportName}) : undefined
    return await withOra({
        work: () => allure.generate(executor),
        start: 'Generating Allure report...',
        success: 'Report generated successfully!',
    });
}

function createExecutor({reportUrl, reportName}: { reportUrl?: string, reportName?: string
}): ExecutorInterface {
    return {
        name: 'Allure Deployer CLI',
        reportUrl,
        reportName
    }
}

// Deploys the report and associated artifacts
async function finalize({args, storage}: {
    args: ArgsInterface, storage?: GoogleStorage
}) {
    const start = (): string => {
        if(args.host)  return 'Deploying report...'
        if(storage)  return 'Uploading results and history...'
        return 'Reading report statistic...'
    }
    const success = (): string => {
        if(args.host)  return 'Report deployed successfully!'
        if(storage)  return 'Results and history uploaded!'
        return 'Statistics read completed!'
    }
    return await withOra({
        work: () => Promise.all([
            getReportStats(args.REPORTS_DIR),
            args.host?.deploy(), // Deploy to Firebase hosting
            storage?.uploadArtifacts(), // Upload artifacts to storage bucket
        ]),
        start: start(),
        success: success(),
    });
}

// Sends notifications about deployment status
async function notify(args: ArgsInterface, resultStatus: ReportStatistic, reportUrl?: string, environment?: Map<string,string>) {
    const notifiers: Notifier[] = [new ConsoleNotifier()];
    if (args.slackConfig) {
        const slackClient = new SlackService(args.slackConfig)
        notifiers.push(new SlackNotifier(slackClient));
    }
    const dashboardUrl = () => {
        return args.storageBucket && args.firebaseProjectId ? getDashboardUrl({
            storageBucket: args.storageBucket,
            projectId: args.firebaseProjectId,
        }) : undefined;
    };

    const notificationData = {resultStatus, reportUrl, storageUrl: dashboardUrl(), environment}
    await new NotifyHandler(notifiers).sendNotifications(notificationData); // Send notifications via all configured notifiers
}

// Handles errors related to cloud storage
export function handleStorageError(error: any) {
    if (error.code === 403) {
        console.error('Access denied. Please ensure that the Cloud Storage API is enabled and that your credentials have the necessary permissions.');
    } else if (error.code === 404) {
        console.error('Bucket not found. Please verify that the bucket name is correct and that it exists.');
    } else if (error.message.includes('Invalid bucket name')) {
        console.error('Invalid bucket name. Please ensure that the bucket name adheres to the naming guidelines.');
    } else {
        console.error('An unexpected error occurred:', error);
    }
}
