import * as process from "node:process";
// Import necessary modules and commands for the main program functionality
import {
    Allure, ArgsInterface,
    ConsoleNotifier, counter,
    FirebaseHost,
    GoogleStorageService,
    getDashboardUrl, GitHubNotifier,
    NotificationData, Notifier,
    NotifierService, SlackService, SlackNotifier,
    Storage, withOra,
} from "./lib.js";
import {Command} from "commander";
import {addDeployCommand} from "./commands/deploy.command.js";
import {addCredentialsCommand} from "./commands/credentials.command.js";
import {addStorageBucketCommand} from "./commands/storage.command.js";
import {addVersionCommand} from "./commands/version.command.js";
import {addSlackTokenCommand} from "./commands/slack-setup.command.js";
import {Storage as GCPStorage} from '@google-cloud/storage'
import {readJsonFile} from "./utilities/file-util.js";
import {ResultsStatus} from "./interfaces/counter.interface.js";
import {GitHubService} from "./services/github.service.js";

// Entry point for the application
export function main() {
    counter.startTimer(); // Start a timer for tracking execution duration
    const program = new Command();
    (async () => {
        setupCommands(program); // Configure CLI commands
        await program.parseAsync(process.argv); // Parse command-line arguments
    })();
}

// Configures available CLI commands
function setupCommands(program: Command) {
    addVersionCommand(program); // Adds version command
    addCredentialsCommand(program); // Adds credentials management command
    addStorageBucketCommand(program); // Adds storage bucket management command
    addSlackTokenCommand(program); // Adds Slack setup command
    const deployCommand = addDeployCommand(program, runDeploy); // Adds deploy command
    program.action(() => {
        program.outputHelp({error: false}); // Displays help if no command is provided
        console.log("\nCommand: deploy");
        console.log("Generate and deploy report on the web\n");
        deployCommand.help({error: false});
    });
}

// Executes the deployment process
async function runDeploy(args: ArgsInterface) {
    const allure = new Allure({args});
    const firebaseHost = new FirebaseHost(args);
    try {
        const cloudStorage = await initializeCloudStorage(args); // Initialize storage bucket
        const [reportUrl, resultsStatus] = await setupStaging(firebaseHost, cloudStorage, allure, args);
        await generateReport({allure, reportUrl, args}); // Generate Allure report
        await deploy(firebaseHost, cloudStorage); // Deploy report and artifacts
        await notify(args, reportUrl, resultsStatus); // Send deployment notifications
    } catch (error) {
        console.error("Deployment failed:", error);
        process.exit(1); // Exit with error code
    }
}

// Initializes cloud storage and verifies the bucket existence
async function initializeCloudStorage(args: ArgsInterface): Promise<Storage | undefined> {
    if (!args.storageBucket) return undefined;
    try {
        const credentials = await readJsonFile(args.runtimeCredentialDir);
        const bucket = new GCPStorage({credentials}).bucket(args.storageBucket);
        const [exists] = await bucket.exists();
        if (!exists) {
            console.log('Storage Bucket does not exist. History and Retries will be disabled');
            return undefined;
        }
        return new Storage(new GoogleStorageService(bucket), args);
    } catch (error) {
        handleStorageError(error);
        throw error;
    }
}

// Prepares files and configurations for deployment
async function setupStaging(host: FirebaseHost, storage: Storage | undefined, allure: Allure, args: ArgsInterface) {
    return await withOra({
        work: () => Promise.all([
            host.init(), // Initialize Firebase hosting site
            counter.countResults(args.RESULTS_PATH), // Count test results
            allure.stageFilesFromMount(), // Prepare Allure files
            storage?.stageFilesFromStorage(), // Prepare cloud storage files
        ]),
        start: 'Staging files...',
        success: 'Files staged successfully.',
    });
}

// Generates the Allure report with metadata
async function generateReport({allure, reportUrl, args}: { allure: Allure, reportUrl: string, args: ArgsInterface }): Promise<string> {
    const githubRunID = process.env.GITHUB_RUN_ID;
    return await withOra({
        work: () => allure.generate({
            name: 'Allure Report Deployer',
            reportUrl: reportUrl,
            buildUrl: args.buildUrl,
            buildName: args.reportName || githubRunID,
            type: githubRunID ? 'github' : undefined,
        }),
        start: 'Generating Allure report...',
        success: 'Report generated successfully.',
    });
}

// Deploys the report and associated artifacts
async function deploy(host: FirebaseHost, storage: Storage | undefined) {
    return await withOra({
        work: () => Promise.all([
            host.deploy(), // Deploy to Firebase hosting
            storage?.uploadArtifacts(), // Upload artifacts to storage bucket
        ]),
        start: 'Deploying...',
        success: 'Deployment successfully.',
    });
}

// Sends notifications about deployment status
async function notify(args: ArgsInterface, reportUrl: string, resultsStatus: ResultsStatus) {
    const notifiers: Notifier[] = [new ConsoleNotifier(args)];
    if (args.slack_token && args.slack_channel) {
        const slackClient = new SlackService(args.slack_token, args.slack_channel)
        const slackNotifier = new SlackNotifier(slackClient, args)
        notifiers.push(slackNotifier);
    }
    const notificationService = new NotifierService(notifiers);
    const dashboardUrl = () => {
        return args.storageBucket ? getDashboardUrl({
            storageBucket: args.storageBucket,
            projectId: args.firebaseProjectId,
        }) : undefined;
    };
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    const outputPath = process.env.GITHUB_OUTPUT;
    if (summaryPath && outputPath) {
        const githubService = new GitHubService({summaryPath, outputPath});
        notifiers.push(new GitHubNotifier(githubService, args));
    }
    const notificationData = new NotificationData(resultsStatus, reportUrl, dashboardUrl());
    await notificationService.sendNotifications(notificationData); // Send notifications via all configured notifiers
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