import ReportBuilder from "./app/report-builder";
import counter from "./app/counter";
import credential from "./app/credential";
import admin from "firebase-admin";
import {
    downloadRequired,
    GITHUB_SUMMARY_PATH, STORAGE_BUCKET,
    websiteId
} from "./app/constant";
import {Storage} from "./app/storage/storage";
import notifier from "./app/notifier";
import {FirebaseStorage} from "./app/storage/firebase-storage";
import {FirebaseHost} from "./app/hosting/firebase-host";


let cloudStorage: Storage | undefined = undefined;
if (STORAGE_BUCKET) {
    const bucket = admin.initializeApp({storageBucket: STORAGE_BUCKET}).storage().bucket()
    cloudStorage = new Storage(new FirebaseStorage(bucket))
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
    notifier.printStats();
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
                ReportBuilder.stageFilesFromMount(),
                downloadRequired ? cloudStorage?.stageFilesFromStorage() : null,
            ])
            // Build report
            await ReportBuilder.generate()
            // Init hosting
            await firebaseHost.init()
        }
        // Handle initialized features
        const [websiteUrlFromHostProvider] = (await Promise.all([
            firebaseHost?.deploy(),
            cloudStorage?.uploadArtifacts()
        ]))

        // Prepare GitHub summary
        const notifierPromises: Promise<void>[] = []
        if (GITHUB_SUMMARY_PATH) {
            notifierPromises.push(notifier.printGithubSummary({
                mountedFilePath: GITHUB_SUMMARY_PATH,
                url: websiteUrlFromHostProvider
            }))
        } else {
            notifier.printSummaryToConsole({url: websiteUrlFromHostProvider})
        }
        // Prepare Slack message
        if (notifier.slackClient) {
            notifierPromises.push(notifier.SendSlackMsg(websiteUrlFromHostProvider))
        }
        // Send notifications async
        if (notifierPromises.length > 0) {
            await Promise.all(notifierPromises)
        }
    })()

}

if (require.main === module) {
    main()
}