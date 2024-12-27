import * as process from "node:process";
import {
    Allure, ArgsInterface,
    ConsoleNotifier, counter,
    FirebaseHost,
    GoogleStorageService,
    getDashboardUrl, GitHubNotifier,
    NotificationData, Notifier,
    NotifierService, RealSlackClient, SlackNotifier,
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
import {ResultsStatus} from "./interfaces/counter.interface";

export function main() {
    counter.startTimer()
    const program = new Command();
    (async () => {
        setupCommands(program);
        await program.parseAsync(process.argv);
    })();
}

function setupCommands(program: Command) {
    addVersionCommand(program);
    addCredentialsCommand(program);
    addStorageBucketCommand(program);
    addSlackTokenCommand(program);
    const deployCommand = addDeployCommand(program, runDeploy);
    program.action(() => {
        program.outputHelp({error: false})
        console.log("\nCommand: deploy")
        console.log("Generate and deploy report on the web\n")
        deployCommand.help({error: false,})
    });
}

async function runDeploy(args: ArgsInterface) {
    const allure = new Allure({args});
    const firebaseHost = new FirebaseHost(args);
    try {
        const cloudStorage = await initializeCloudStorage(args);
        const [reportUrl, resultsStatus] = await setupStaging(firebaseHost, cloudStorage, allure, args);
        await generateReport({allure, reportUrl, args: args});
        await deploy(firebaseHost, cloudStorage);
        await notify(args, reportUrl, resultsStatus);
    } catch (error) {
        console.error("Deployment failed:", error);
        process.exit(1);
    }
}

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


async function setupStaging(host: FirebaseHost, storage: Storage | undefined, allure: Allure, args: ArgsInterface) {
    return await withOra({
        work: () => Promise.all([
            host.init(),//Returns reportUrl
            counter.countResults(args.RESULTS_PATH),
            allure.stageFilesFromMount(),
            storage?.stageFilesFromStorage(),
        ]), start: 'Staging files...', success: 'Files staged successfully.',
    })
}

async function generateReport({allure, reportUrl, args}: { allure: Allure, reportUrl: string, args: ArgsInterface }): Promise<string> {
    const githubRunID = process.env.GITHUB_RUN_ID
    return await withOra({
        work: () => allure.generate({
            name: 'Allure Report Deployer',
            reportUrl: reportUrl,
            buildUrl: args.buildUrl,
            buildName: args.reportName || githubRunID,
            type: githubRunID ? 'github' : undefined,
        }), start: 'Generating Allure report...', success: 'Report generated successfully.',
    })
}

async function deploy(host: FirebaseHost, storage: Storage | undefined) {
    return await withOra({
        work: () => Promise.all([
            host.deploy(), // Returns reportUrl
            storage?.uploadArtifacts()
        ]), start: 'Deploying...', success: 'Deployment successfully.',
    })
}

async function notify(args: ArgsInterface, reportUrl: string, resultsStatus: ResultsStatus) {
    const notifiers: Notifier[] = [new ConsoleNotifier()]
    if (args.slack_token && args.slack_channel) {
        new SlackNotifier(new RealSlackClient(args.slack_token, args.slack_channel))
    }
    const notificationService = new NotifierService(notifiers)
    const dashboardUrl = () => {
        return args.storageBucket ? getDashboardUrl({
            storageBucket: args.storageBucket,
            projectId: args.firebaseProjectId
        }) : undefined
    }
    const githubSummaryPath = process.env.GITHUB_STEP_SUMMARY
    if (githubSummaryPath) {
        notifiers.push(new GitHubNotifier(githubSummaryPath))
    }
    const notificationData = new NotificationData(resultsStatus, reportUrl, dashboardUrl())
    await notificationService.sendNotifications(notificationData)
}

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




