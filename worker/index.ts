import AllureService from "./app/allure-service";
import counter from "./app/counter";
import credential from "./app/credential";
import admin from "firebase-admin";
import {
    downloadRequired, STORAGE_BUCKET,
    websiteId
} from "./app/constant";
import {Storage} from "./app/storage/storage";
import {FirebaseStorageService} from "./app/storage/firebase-storage.service";
import {FirebaseHost} from "./app/hosting/firebase-host";
import {Notifier} from "./app/messaging/notifier.interface";
import {githubNotifier} from "./app/messaging/github-notifier";
import consoleNotifier from "./app/messaging/console-notifier";
import {slackNotifier} from "./app/messaging/slack-notifier";
import {NotifierService} from "./app/messaging/notifier.service";
import {NotificationData} from "./app/messaging/notification.model";
import {dashboardUrl, printStats} from "./app/util";


let cloudStorage: Storage | undefined = undefined;
if (STORAGE_BUCKET) {
    const bucket = admin.initializeApp({storageBucket: STORAGE_BUCKET}).storage().bucket()
    cloudStorage = new Storage(new FirebaseStorageService(bucket))
}

/**
 * Entry Point
 *
 * Initializes the application and sets up file monitoring, report generation,
 * and notifications.
 */
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


        const notifiers: Notifier[] = []
        notifiers.push(consoleNotifier)
        if(slackNotifier){
            notifiers.push(slackNotifier)
        }
        if(githubNotifier){
            notifiers.push(githubNotifier)
        }

        const notificationData = new NotificationData(counter ,reportUrl, dashboardUrl() )
        await new NotifierService(notifiers).sendNotifications(notificationData)
    })()

}

if (require.main === module) {
    main()
}