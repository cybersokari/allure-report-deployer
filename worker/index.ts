import * as chokidar from 'chokidar';
import {
    getAllFilesStream, publishToFireBaseHosting,
} from "./app/util";
import ReportBuilder from "./app/report-builder";
import {CloudStorage} from "./app/cloud-storage";
import counter from "./app/counter";
import notifier from "./app/notifier";
import credential from "./app/credential";
import {BatchProcessor} from "./app/batch-processor";

export const DEBUG = process.env.FIREBASE_STORAGE_EMULATOR_HOST !== undefined || false;
export const MOUNTED_PATH = '/allure-results'
export const HOME_DIR = '/app'
export const STAGING_PATH = `${HOME_DIR}/allure-results`;
export const REPORTS_DIR = `${HOME_DIR}/allure-report`
export const websiteId = process.env.WEBSITE_ID || null;
export const STORAGE_BUCKET = process.env.STORAGE_BUCKET || null;
export const cloudStorage = STORAGE_BUCKET ? CloudStorage.getInstance(STORAGE_BUCKET) : null;
export const keepHistory = process.env.KEEP_HISTORY?.toLowerCase() === 'true'
export const keepRetires = process.env.KEEP_RETRIES?.toLowerCase() === 'true'
export const watchMode = process.env.WATCH_MODE?.toLowerCase() === 'true' || false;
export const fileProcessingConcurrency = watchMode ? 5 : 10


/**
 * Entry Point
 *
 * Initializes the application and sets up file monitoring, report generation,
 * and notifications.
 * Supports both watch mode (real-time updates) and
 * batch processing of files.
 */
export function main(): void {
    counter.startTimer()
    if (!cloudStorage && !websiteId) {
        console.warn('WEBSITE_ID or STORAGE_BUCKET is required');
        return
    }
    // Create it now, so that project_id will be available for
    // Site deployment and messaging.
    void credential.create()

    if (watchMode) {
        const processor = new BatchProcessor()
        chokidar.watch('/allure-results', {
            ignored: '^(?!.*\\.(json|png|jpeg|jpg|gif|properties|log|webm)$).*$',
            persistent: true,
            awaitWriteFinish: true,
            usePolling: true,
            depth: 2, // Limit recursive depth
        }).on('add', (filePath: string) => {
            processor.add(filePath);
        });
        console.log("Watching for file additions...");
    } else {
        (async () => {

            let url
            if(websiteId){
                // Stage files, generateAndHost then upload history if enabled
                await Promise.all([
                    ReportBuilder.stageFiles(getAllFilesStream(MOUNTED_PATH)),
                    cloudStorage?.stageRemoteFiles({concurrency: fileProcessingConcurrency})
                ])
                const path = await ReportBuilder.generate()
                url = await publishToFireBaseHosting(path)
                if(keepHistory){
                    await cloudStorage?.uploadHistory()
                }
            }

            if (cloudStorage && keepRetires) {
                await cloudStorage.uploadResults()
            }
            const summaryPath = process.env.GITHUB_STEP_SUMMARY
            const promises = []
            if(summaryPath){
                promises.push(notifier.printGithubSummary({mountedFilePath: summaryPath, url: url}))
            }
            const token = process.env.SLACK_TOKEN;
            const conversationId = process.env.SLACK_CHANNEL_ID;
            if(conversationId && token){
                promises.push(notifier.SendSlackMsg({conversationId: conversationId, token: token, url: url}))
            }
            await Promise.all(promises)

        })()
    }
    notifier.printStats()
}

if (require.main === module) {
    main()
}