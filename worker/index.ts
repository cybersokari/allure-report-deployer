import AllureService from "./app/features/allure.js";
import counter from "./app/utilities/counter.js";
import credential from "./app/utilities/credential.js";
import {
    downloadRequired, STORAGE_BUCKET,
    websiteId
} from "./app/utilities/constant.js";
import {Storage} from "./app/features/storage.js";
import {Storage as GcpStorage} from "@google-cloud/storage";
import {FirebaseStorageService} from "./app/services/firebase-storage.service.js";
import {FirebaseHost} from "./app/features/hosting/firebase-host.js";
import {Notifier} from "./app/interfaces/notifier.interface.js";
import {githubNotifier} from "./app/features/messaging/github-notifier.js";
import consoleNotifier from "./app/features/messaging/console-notifier.js";
import {slackNotifier} from "./app/features/messaging/slack-notifier.js";
import {NotifierService} from "./app/services/notifier.service.js";
import {NotificationData} from "./app/models/notification.model.js";
import {dashboardUrl, printStats} from "./app/utilities/util.js";
import { readFile } from "fs/promises";
import * as path from "node:path";


let cloudStorage: Storage | undefined = undefined;
if (STORAGE_BUCKET) {
    const jsonFilePath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS!);
    const gcpJson = JSON.parse(await readFile(jsonFilePath, "utf-8"));
    const bucket = new GcpStorage({credentials: gcpJson }).bucket(STORAGE_BUCKET)
    cloudStorage = new Storage(new FirebaseStorageService(bucket))
}

export function main(): void {
    counter.startTimer()
    if (!cloudStorage && !websiteId) {
        console.warn('WEBSITE_ID or STORAGE_BUCKET is required');
        return
    }
    printStats();
    (async () => {

        try {
            await credential.init()
        } catch (error) {
            console.warn('Invalid Google Credentials JSON: Are you sure you have the correct file?');
            return
        }
        let firebaseHost: FirebaseHost | undefined
        if (websiteId) {

            firebaseHost = new FirebaseHost({websiteId: websiteId, projectId: credential.projectId});

            // Stage files
            await Promise.all([
                AllureService.stageFilesFromMount(),
                downloadRequired ? cloudStorage?.stageFilesFromStorage() : null,
            ])
            // Build report
            await AllureService.generate()
            // Init hosting
            await firebaseHost.init()
        }
        // Handle initialized features
        const [reportUrl] = (await Promise.all([
            firebaseHost?.deploy(),
            cloudStorage?.uploadArtifacts()
        ]))
        await sendNotifications(reportUrl)
    })()

}

if (import.meta.url === new URL(import.meta.url).toString()) {
    main();
}

async function sendNotifications(reportUrl: string | undefined) {
    const notifiers: Notifier[] = []
    notifiers.push(consoleNotifier)
    if(slackNotifier){
        notifiers.push(slackNotifier)
    }
    if(githubNotifier){
        notifiers.push(githubNotifier)
    }
    const notificationService = new NotifierService(notifiers)
    const notificationData = new NotificationData(counter ,reportUrl, dashboardUrl())
    await notificationService.sendNotifications(notificationData)
}