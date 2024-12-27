import * as process from "node:process";
import {
    Allure, ArgsInterface,
    ConsoleNotifier, counter,
    FirebaseHost,
    FirebaseStorageService,
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

export function main() {
    const program = new Command();
    (async () => {
        setupCommands(program);
        // Show help if no command is provided
        program.action(() => {
            program.outputHelp();
            process.exit(0);
        });
        await program.parseAsync(process.argv);
    })();
}

function setupCommands(program: Command) {
    addVersionCommand(program);
    addCredentialsCommand(program);
    addStorageBucketCommand(program);
    addSlackTokenCommand(program);
    addDeployCommand(program, runDeploy);
}

async function runDeploy(args: ArgsInterface) {
    const cloudStorage = await initializeCloudStorage(args);
    const allure = new Allure({args});
    const firebaseHost = new FirebaseHost(args);

    try {
        const [reportUrl] = await setupStaging(firebaseHost, cloudStorage, allure);
        await generateReport({allure, reportUrl, args: args});
        await deploy(firebaseHost, cloudStorage);
        await notify(args, reportUrl);
    } catch (error) {
        console.error("Deployment failed:", error);
        process.exit(1);
    }
}

async function initializeCloudStorage(args: ArgsInterface): Promise<Storage | undefined> {
    if (!args.storageBucket) return undefined;

    const credentials = await readJsonFile(args.runtimeCredentialDir);
    const bucket = new GCPStorage({credentials}).bucket(args.storageBucket);
    return new Storage(new FirebaseStorageService(bucket), args);
}


async function setupStaging(host: FirebaseHost, storage: Storage | undefined, allure: Allure) {
    return await withOra({
        work: () => Promise.all([
            host.init(),//Returns reportUrl
            allure.stageFilesFromMount(),
            storage?.stageFilesFromStorage(),
        ]), start: 'Staging files...', success: 'Files staged successfully.',
    })
}

async function generateReport({allure, reportUrl, args}: { allure: Allure, reportUrl: string, args: ArgsInterface }) {
    const githubRunID = process.env.GITHUB_RUN_ID
    return await withOra({
        work: () => allure.generate({
            name: 'Allure Report Deployer',
            reportUrl: reportUrl,
            buildUrl: args.buildUrl,
            buildName: args.reportName || `run-${githubRunID}`,
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

async function notify(args: ArgsInterface, reportUrl: string) {
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
    const notificationData = new NotificationData(counter, reportUrl, dashboardUrl())
    await notificationService.sendNotifications(notificationData)
}




