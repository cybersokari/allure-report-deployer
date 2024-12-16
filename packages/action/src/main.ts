import {
    Allure, ArgsInterface,
    counter,
    FirebaseHost,
    FirebaseStorageService, getDashboardUrl,
    GitHubNotifier, NotificationData, Notifier, NotifierService,
    printStats, RealSlackClient, SlackNotifier,
    Storage
} from "@allure/shared";
import {ActionsCredentials} from "./credentials.js";
import {Storage as GcpStorage} from "@google-cloud/storage";
import {getArgs} from "./constants.js";
import core from "@actions/core";


export function main() {
    counter.startTimer();
    const creds = ActionsCredentials.getInstance();

    (async ()=>{
        await creds.init()
        const args = getArgs(creds)
        try {
            await creds.init()
            printStats(args)
        } catch (error) {
            console.warn('Invalid Google Credentials JSON: Are you sure you have the correct file?');
            return
        }

        let cloudStorage: Storage | undefined = undefined;
        if (args.storageBucket) {
            const bucket = new GcpStorage({credentials: creds.data}).bucket(args.storageBucket)
            cloudStorage = new Storage(new FirebaseStorageService(bucket), args)
        }

        let firebaseHost: FirebaseHost | undefined
        if (args.websiteId) {
            firebaseHost = new FirebaseHost(args.websiteId, args);

            const allure = new Allure({args: args})
            // Stage files
            await Promise.all([
                allure.stageFilesFromMount(),
                args.downloadRequired ? cloudStorage?.stageFilesFromStorage() : null,
            ])
            // Build report
            await allure.generate()
            // Init hosting
            await firebaseHost.init()
        }
        // Handle initialized features
        const [reportUrl] = (await Promise.all([
            firebaseHost?.deploy(),
            cloudStorage?.uploadArtifacts()
        ]))
        await sendNotifications(reportUrl, args)
    })()
}
export async function sendNotifications(reportUrl: string | undefined, args: ArgsInterface) {
    const notifiers: Notifier[] = []

    const slackToken = core.getInput('slack_token')
    const slackChannelId = core.getInput('slack_channel_id')
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