import {
    ConsoleNotifier, counter,
    EnvCredential, getDashboardUrl,
    GitHubNotifier, NotificationData, Notifier, NotifierService,
    RealSlackClient,
    SlackNotifier
} from "@allure/shared";
import {GITHUB_SUMMARY_PATH, slackChannelId, slackToken, STORAGE_BUCKET} from "./constants.js";

export let githubNotifier: GitHubNotifier | undefined;
if(GITHUB_SUMMARY_PATH){
    githubNotifier = new GitHubNotifier(GITHUB_SUMMARY_PATH)
}

export let slackNotifier: SlackNotifier | undefined;
if(slackToken && slackChannelId){
    slackNotifier = new SlackNotifier(new RealSlackClient(slackToken, slackChannelId))
}

export const credential = EnvCredential.getInstance();
export const consoleNotifier = new ConsoleNotifier()

export async function sendNotifications(reportUrl: string | undefined, projectId: string | undefined) {
    const notifiers: Notifier[] = []
    notifiers.push(consoleNotifier)
    if (slackNotifier) {
        notifiers.push(slackNotifier)
    }
    if (githubNotifier) {
        notifiers.push(githubNotifier)
    }
    const notificationService = new NotifierService(notifiers)
    const dashboardUrl = ()=> {
        return STORAGE_BUCKET ? getDashboardUrl({storageBucket: STORAGE_BUCKET, projectId: projectId}) : undefined
    }
    const notificationData = new NotificationData(counter, reportUrl, dashboardUrl())
    await notificationService.sendNotifications(notificationData)
}