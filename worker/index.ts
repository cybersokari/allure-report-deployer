import * as chokidar from 'chokidar';
import {
    appLog,
    getAllFilesStream, publishToFireBaseHosting,
} from "./app/util";
import ReportBuilder from "./app/report-builder";
import counter from "./app/counter";
import credential from "./app/credential";
import {BatchProcessor} from "./app/batch-processor";
import {Notifier} from "./app/notifier";
import fs from "fs/promises";
import {
    cloudStorage,
    fileProcessingConcurrency,
    Icon, keepHistory, keepResults,
    MOUNTED_PATH,
    STAGING_PATH,
    watchMode,
    websiteId
} from "./app/constant";

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
    new Notifier().printStats();

    (async () => {
        try {// Initializing project_id from Google credentials
            await credential.create()
        } catch (error) {
            console.error('Failed to process Google credentials: Are you sure you have the correct file?', error);
            return
        }
        if(websiteId){
            await fs.mkdir(`${STAGING_PATH}/history`, {recursive: true});
        }
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
            let url : string | null;
            let newReportPath : string | null = null;
            if (websiteId) {
                // Stage files, generateAndHost then upload history if enabled
                await Promise.all([
                    ReportBuilder.stageFiles(getAllFilesStream(MOUNTED_PATH)),
                    cloudStorage?.stageRemoteFiles({concurrency: fileProcessingConcurrency})
                ])
                // Build report
                newReportPath = await ReportBuilder.generate()
            }
            // Host report, save history, save results.
            appLog(`${Icon.HOUR_GLASS}  Deploying to Firebase...`);
            url = (await Promise.all([
                newReportPath ? publishToFireBaseHosting(newReportPath) : null,
                keepHistory && newReportPath && cloudStorage ? cloudStorage.uploadHistory() : null,
                keepResults && cloudStorage ? cloudStorage.uploadResults() : null
            ]))[0]

            // Print GitHub summary
            const githubStepSummary = process.env.GITHUB_STEP_SUMMARY
            const notifier = new Notifier()
            const notifierPromises : Promise<void>[] = []
            if (githubStepSummary) {
                notifierPromises.push(notifier.printGithubSummary({
                    mountedFilePath: githubStepSummary,
                    url: url
                }))
            } else {
                notifier.printSummaryToConsole({url: url})
            }
            // Send Slack message
            const token = process.env.SLACK_TOKEN;
            const conversationId = process.env.SLACK_CHANNEL_ID;
            if (conversationId && token) {
                notifierPromises.push(notifier.SendSlackMsg({
                    conversationId: conversationId,
                    token: token, url: url
                }))
            }
            if(notifierPromises.length > 0){
                await Promise.all(notifierPromises)
            }
        }
    })()

}

if (require.main === module) {
    main()
}