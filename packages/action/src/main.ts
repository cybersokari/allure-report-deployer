import {
    Allure, ArgsInterface,
    counter,
    FirebaseHost,
    FirebaseStorageService, getDashboardUrl,
    GitHubNotifier, NotificationData, Notifier, NotifierService,
    printStats, RealSlackClient, SlackNotifier,
    Storage, GCPStorage, appLog, Icon, ExecutorInterface
} from "allure-deployer-shared";
import {ActionsCredentials} from "./credentials.js";
import {getArgs} from "./constants.js";

export function main() {
    counter.startTimer();

    const creds = ActionsCredentials.getInstance();

    (async ()=>{
        try {
            await creds.init()
        } catch (error) {
            console.warn('Invalid Google Credentials JSON: Are you sure you have the correct file?')
            process.exit(1)
        }
        const args = getArgs(creds)
        if(!args.RESULTS_PATH){
            console.error('allure_results_path is required')
            process.exit(1)
        }

        printStats(args)

        let cloudStorage: Storage | undefined;
        if (args.storageBucket) {
            const bucket = new GCPStorage({credentials: creds.data}).bucket(args.storageBucket)
            cloudStorage = new Storage(new FirebaseStorageService(bucket), args)
        }

        const allure = new Allure({args: args})
        // Stage files
        await Promise.all([
            allure.stageFilesFromMount(),
            args.downloadRequired ? cloudStorage?.stageFilesFromStorage() : null,
        ])
        appLog(`${Icon.HOUR_GLASS}  Generating Allure report...`)
        const firebaseHost = new FirebaseHost(args);
        const reportUrl = await firebaseHost.init()
        const executor: ExecutorInterface = {
            name: 'Allure Report Deployer',
            type: 'github',
            buildUrl: args.buildUrl,
            reportUrl: reportUrl
        }
        await allure.generate(executor)
        // Handle initialized features
        await Promise.all([
            firebaseHost.deploy(),
            cloudStorage?.uploadArtifacts()
        ])
        await sendNotifications(reportUrl, args)
    })()
}
export async function sendNotifications(reportUrl: string | undefined, args: ArgsInterface) {
    const notifiers: Notifier[] = []

    const slackToken = process.env.SLACK_TOKEN
    const slackChannelId = process.env.SLACK_CHANNEL_ID
    if (slackToken && slackChannelId) {
        notifiers.push(new SlackNotifier(new RealSlackClient(slackToken, slackChannelId)))
    }

    notifiers.push(new GitHubNotifier(process.env.GITHUB_STEP_SUMMARY!))
    const notificationService = new NotifierService(notifiers)
    const dashboardUrl = ()=> {
        return args.storageBucket ? getDashboardUrl({storageBucket: args.storageBucket, projectId: args.firebaseProjectId}) : undefined
    }
    const notificationData = new NotificationData(counter, reportUrl, dashboardUrl())
    await notificationService.sendNotifications(notificationData)
}