import {
    publishToFireBaseHosting,
} from "./app/util";
import ReportBuilder from "./app/report-builder";
import counter from "./app/counter";
import credential from "./app/credential";
import {Notifier} from "./app/notifier";
import fs from "fs/promises";
import {
    cloudStorage, GITHUB_SUMMARY_PATH,
    RESULTS_STAGING_PATH,
    websiteId
} from "./app/constant";

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
    new Notifier().printStats();

    (async () => {
        try {// Initializing project_id from Google credentials
            await credential.create()
        } catch (error) {
            console.error('Failed to process Google credentials: Are you sure you have the correct file?', error);
            return
        }
        if (websiteId) {
            await fs.mkdir(`${RESULTS_STAGING_PATH}/history`, {recursive: true});
        }

        if (websiteId) {
            // Stage files
            await Promise.all([
                ReportBuilder.stageFilesFromMount(),
                cloudStorage?.stageFilesFromStorage()
            ])
            // Build report
            await ReportBuilder.generate()
        }
        // Host report and uploadArtifacts
        const [url] = (await Promise.all([
            publishToFireBaseHosting(),
            cloudStorage?.uploadArtifacts()
        ]))


        // Prepare GitHub summary
        const notifier = new Notifier()
        const notifierPromises: Promise<void>[] = []
        if (GITHUB_SUMMARY_PATH) {
            notifierPromises.push(notifier.printGithubSummary({
                mountedFilePath: GITHUB_SUMMARY_PATH,
                url: url
            }))
        } else {
            notifier.printSummaryToConsole({url: url})
        }
        // Prepare Slack message
        const token = process.env.SLACK_TOKEN;
        const conversationId = process.env.SLACK_CHANNEL_ID;
        if (conversationId && token) {
            notifierPromises.push(notifier.SendSlackMsg({
                conversationId: conversationId,
                token: token, url: url
            }))
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