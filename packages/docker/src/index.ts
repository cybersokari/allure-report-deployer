import {
    Allure, ArgsInterface,
} from "@allure/shared";
import {Storage as GcpStorage} from "@google-cloud/storage";
import {
    Storage,
    FirebaseHost,
    printStats,
    counter,
    FirebaseStorageService,
} from "@allure/shared";
import {readFile} from "fs/promises";
import * as path from "node:path";
import {credential, sendNotifications} from "./declarations.js";
import {
    ARCHIVE_DIR, downloadRequired,
    fileProcessingConcurrency,
    HOME_DIR, keepHistory, keepResults,
    MOUNTED_PATH,
    REPORTS_DIR,
    RESULTS_STAGING_PATH, showRetries, STORAGE_BUCKET, uploadRequired, websiteId
} from "./constants.js";


export function main(): void {
    counter.startTimer()
    if (!STORAGE_BUCKET && !websiteId) {
        console.warn('WEBSITE_ID or STORAGE_BUCKET is required');
        return
    }
    (async () => {
        let args : ArgsInterface;
        try {
            await credential.init()
             args = {
                ARCHIVE_DIR: ARCHIVE_DIR,
                HOME_DIR: HOME_DIR,
                MOUNTED_PATH: MOUNTED_PATH,
                REPORTS_DIR: REPORTS_DIR,
                RESULTS_STAGING_PATH: RESULTS_STAGING_PATH,
                fileProcessingConcurrency: fileProcessingConcurrency,
                keepHistory: keepHistory,
                keepResults: keepResults,
                showHistory: keepHistory,
                showRetries: showRetries,
                storageBucket: STORAGE_BUCKET,
                websiteId: websiteId,
                uploadRequired: uploadRequired,
                downloadRequired: downloadRequired,
                firebaseProjectId: credential.projectId
            }
            printStats(args);
        } catch (error) {
            console.warn('Invalid Google Credentials JSON: Are you sure you have the correct file?');
            return
        }

        let cloudStorage: Storage | undefined = undefined;
        if (STORAGE_BUCKET) {
            const jsonFilePath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS!);
            const gcpJson = JSON.parse(await readFile(jsonFilePath, "utf-8"));
            const bucket = new GcpStorage({credentials: gcpJson}).bucket(STORAGE_BUCKET)
            cloudStorage = new Storage(new FirebaseStorageService(bucket), args)
        }

        let firebaseHost: FirebaseHost | undefined
        if (websiteId) {
            firebaseHost = new FirebaseHost(websiteId, args);

            const allure = new Allure({args: args})
            // Stage files
            await Promise.all([
                allure.stageFilesFromMount(),
                downloadRequired ? cloudStorage?.stageFilesFromStorage() : null,
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
        await sendNotifications(reportUrl, args.firebaseProjectId)
    })()

}

if (import.meta.url === new URL(import.meta.url).toString()) {
    main();
}

