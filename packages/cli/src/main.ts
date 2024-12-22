import * as process from "node:process";
import {
    Allure,
    ConsoleNotifier, counter,
    FirebaseHost,
    FirebaseStorageService,
    GCPStorage, getDashboardUrl,
    NotificationData, Notifier,
    NotifierService, RealSlackClient, SlackNotifier,
    Storage,
} from "allure-deployer-shared";
import {Command} from "commander";
import {addDeployCommand} from "./commands/deploy.command.js";
import {addCredentialsCommand} from "./commands/credentials.command.js";
import {addStorageBucketCommand} from "./commands/storage.command.js";
import {isJavaInstalled, readJsonFile} from "./utils/file-util.js";
import {CliArguments} from "./utils/cli-arguments.js";
import {oraPromise} from "ora";
import {addVersionCommand} from "./commands/version.command.js";
import {addSlackTokenCommand} from "./commands/slack-setup.command.js";


export function main() {
    const defaultProgram = new Command();
    (async ()=> {
        addVersionCommand(defaultProgram);
        addCredentialsCommand(defaultProgram);
        addStorageBucketCommand(defaultProgram);
        addDeployCommand(defaultProgram, runDeploy);
        addSlackTokenCommand(defaultProgram);
        // Default action to show help
        defaultProgram.action(() => {
            defaultProgram.outputHelp();
            process.exit(0);
        });
        await defaultProgram.parseAsync(process.argv);
    })()
}

async function runDeploy(args: CliArguments) {

    let cloudStorage: Storage | undefined = undefined;
    if (args.storageBucket) {
        const creds =  await readJsonFile(args.runtimeCredentialDir)
        const bucket = new GCPStorage({credentials: creds}).bucket(args.storageBucket)
        cloudStorage = new Storage(new FirebaseStorageService(bucket), args)
    }

    // const spinner = Ora()
    const allure = new Allure({args: args})

    await oraPromise((ora)=> {
        ora.start('Staging files...')
        // Stage files
        return Promise.all([
            allure.stageFilesFromMount(),
            args.downloadRequired ? cloudStorage?.stageFilesFromStorage() : null,
        ])
    },{successText: 'Files staged successfully.'})

    if(!isJavaInstalled()){
        console.error('Error: JAVA_HOME not found. Allure commandline requires JAVA installed')
        process.exit(1)
    }
    // Build report
    await oraPromise((ora)=> {
        ora.start('Generating Allure report... ')
        return allure.generate()
    }, {successText: 'Report generated successfully.'})
    // Init hosting
    const firebaseHost = new FirebaseHost(args);
    await firebaseHost.init()

    // Handle initialized features
    const [reportUrl] = await oraPromise((ora)=> {
        ora.start('Deploying...')
        // Stage files
        return Promise.all([
            firebaseHost?.deploy(),
            cloudStorage?.uploadArtifacts()
        ])
    },{successText: 'Deployment successfully.'})

    const notifiers: Notifier[] = [new ConsoleNotifier()]
    if(args.slack_token && args.slack_channel){
        new SlackNotifier(new RealSlackClient(args.slack_token, args.slack_channel))
    }
    const notificationService = new NotifierService(notifiers)
    const dashboardUrl = ()=> {
        return args.storageBucket ? getDashboardUrl({storageBucket: args.storageBucket, projectId: args.firebaseProjectId}) : undefined
    }
    const notificationData = new NotificationData(counter, reportUrl, dashboardUrl())
    await notificationService.sendNotifications(notificationData)
}



