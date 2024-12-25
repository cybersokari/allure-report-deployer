import * as process from "node:process";
import {
    Allure,
    ConsoleNotifier, counter,
    FirebaseHost,
    FirebaseStorageService,
    GCPStorage, getDashboardUrl, GitHubNotifier,
    NotificationData, Notifier,
    NotifierService, RealSlackClient, SlackNotifier,
    Storage,
} from "allure-deployer-shared";
import {Command} from "commander";
import {addDeployCommand} from "./commands/deploy.command.js";
import {addCredentialsCommand} from "./commands/credentials.command.js";
import {addStorageBucketCommand} from "./commands/storage.command.js";
import {readJsonFile} from "./utils/file-util.js";
import {CliArguments} from "./utils/cli-arguments.js";
import {oraPromise} from "ora";
import {addVersionCommand} from "./commands/version.command.js";
import {addSlackTokenCommand} from "./commands/slack-setup.command.js";

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

async function runDeploy(args: CliArguments) {
    const cloudStorage = await initializeCloudStorage(args);
    const allure = new Allure({ args });
    const firebaseHost = new FirebaseHost(args);

    try {
        const [reportUrl] = await setupStaging(firebaseHost, cloudStorage, allure);
        await generateReport({ allure, reportUrl, buildUrl: args.buildUrl });
        await deploy(firebaseHost, cloudStorage);
        await notify(args, reportUrl);
    } catch (error) {
        console.error("Deployment failed:", error);
        process.exit(1);
    }
}

async function initializeCloudStorage(args: CliArguments): Promise<Storage | undefined> {
    if (!args.storageBucket) return undefined;

    const credentials = await readJsonFile(args.runtimeCredentialDir);
    const bucket = new GCPStorage({ credentials }).bucket(args.storageBucket);
    return new Storage(new FirebaseStorageService(bucket), args);
}


async function setupStaging(host: FirebaseHost, storage: Storage | undefined, allure: Allure) {
    return await oraPromise(() => {
        return Promise.all([
            host.init(),//Returns reportUrl
            allure.stageFilesFromMount(),
            storage?.stageFilesFromStorage(),
        ])
    }, {text: 'Staging files...', successText: 'Files staged successfully.'})
}

async function generateReport({allure, reportUrl, buildUrl}: { allure: Allure, reportUrl: string, buildUrl?: string }) {
    return await oraPromise(() => {
        return allure.generate({
            name: 'Allure Report Deployer',
            reportUrl: reportUrl,
            buildUrl: buildUrl,
            type: buildUrl ? 'github' : undefined,
        })
    }, {
        text: 'Generating Allure report...',
        successText: 'Report generated successfully.'
    })
}

async function deploy(host: FirebaseHost, storage: Storage | undefined) {
    return await oraPromise(() => {
        return Promise.all([
            host.deploy(), // Returns reportUrl
            storage?.uploadArtifacts()
        ])
    }, {text: 'Deploying...', successText: 'Deployment successfully.'})
}

async function notify(args: CliArguments, reportUrl: string) {
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




