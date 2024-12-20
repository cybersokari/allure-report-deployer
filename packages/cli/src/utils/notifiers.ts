import {
    ArgsInterface,
    ConsoleNotifier, counter, getDashboardUrl,
    NotificationData,
    Notifier,
    NotifierService,
} from "allure-deployer-shared";

// export let slackNotifier: SlackNotifier | undefined;
//
// if(slackToken && slackChannelId){
//     slackNotifier = new SlackNotifier(new RealSlackClient(slackToken, slackChannelId))
// }

export const consoleNotifier = new ConsoleNotifier()

export async function sendNotifications(reportUrl: string | undefined, args: ArgsInterface) {
    const notifiers: Notifier[] = []
    notifiers.push(consoleNotifier)
    // if (slackNotifier) {
    //     notifiers.push(slackNotifier)
    // }
    const notificationService = new NotifierService(notifiers)
    const dashboardUrl = ()=> {
        return args.storageBucket ? getDashboardUrl({storageBucket: args.storageBucket, projectId: args.firebaseProjectId}) : undefined
    }
    const notificationData = new NotificationData(counter, reportUrl, dashboardUrl())
    await notificationService.sendNotifications(notificationData)
}