import {
    Allure, ArgsInterface, FirebaseStorageService,
    Storage,
    FirebaseHost,
    printStats,
    counter,
    GCPStorage, appLog, Icon, AllureV3Service,
} from "allure-deployer-shared";
import {readFile} from "fs/promises";
import * as path from "node:path";
import {credential, sendNotifications} from "./notifiers.js";
import {
    ARCHIVE_DIR, downloadRequired,
    fileProcessingConcurrency,
    HOME_DIR, keepHistory, keepResults,
    MOUNTED_PATH,
    REPORTS_DIR,
    RESULTS_STAGING_PATH, showRetries, STORAGE_BUCKET, uploadRequired, reportId, V3
} from "./constants.js";


export function main(): void {
    counter.startTimer();

    (async () => {
        let args: ArgsInterface;
        try {
            await credential.init()
            args = {
                ARCHIVE_DIR: ARCHIVE_DIR,
                HOME_DIR: HOME_DIR,
                RESULTS_PATH: MOUNTED_PATH,
                REPORTS_DIR: REPORTS_DIR,
                RESULTS_STAGING_PATH: RESULTS_STAGING_PATH,
                fileProcessingConcurrency: fileProcessingConcurrency,
                keepHistory: keepHistory && !V3,
                keepResults: keepResults,
                showHistory: keepHistory && !V3,
                showRetries: showRetries,
                storageBucket: STORAGE_BUCKET,
                reportId: reportId,
                uploadRequired: uploadRequired,
                downloadRequired: downloadRequired,
                firebaseProjectId: credential.projectId,
                v3: true
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
            const bucket = new GCPStorage({credentials: gcpJson}).bucket(STORAGE_BUCKET)
            cloudStorage = new Storage(new FirebaseStorageService(bucket), args)
        }

        let firebaseHost: FirebaseHost | undefined
        firebaseHost = new FirebaseHost(args);

        const allure = new Allure({args: args, allureRunner: new AllureV3Service()})
        // Stage files
        await Promise.all([
            allure.stageFilesFromMount(),
            downloadRequired ? cloudStorage?.stageFilesFromStorage() : null,
        ])
        // Build report
        appLog(`${Icon.HOUR_GLASS}  Generating Allure report...`)
        await allure.generate()
        // Init hosting
        appLog(`${Icon.HOUR_GLASS}  Init FIrebase...`)
        await firebaseHost.init()
        // Handle initialized features
        appLog(`${Icon.HOUR_GLASS}  Deploying...`)
        const [reportUrl] = (await Promise.all([
            firebaseHost?.deploy(),
            cloudStorage?.uploadArtifacts()
        ]))
        await sendNotifications(reportUrl, args.firebaseProjectId)
    })()

}

