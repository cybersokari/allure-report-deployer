import * as chokidar from 'chokidar';
import {getAllFilesStream,
    getProjectIdFromCredentialsFile,
} from "./app/util";
import ReportBuilder from "./app/report-builder";
import {CloudStorage} from "./app/cloud-storage";
import counter from "./app/counter";
import {writeGitHubSummary} from "./app/site-builder";

export const MOUNTED_PATH = '/allure-results'
export const HOME_DIR = '/app'
export const STAGING_PATH = `${HOME_DIR}/allure-results`;
export const REPORTS_DIR = `${HOME_DIR}/allure-report`
export const websiteId = process.env.WEBSITE_ID || null;
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || null;
export const cloudStorage = STORAGE_BUCKET ? CloudStorage.getInstance(STORAGE_BUCKET) : null;
export const keepHistory = process.env.KEEP_HISTORY?.toLowerCase() === 'true'
export const keepRetires = process.env.KEEP_RETRIES?.toLowerCase() === 'true'
const watchMode = process.env.WATCH_MODE?.toLowerCase() === 'true';

/**
 * Download remote files if WEBSITE_ID is provided.
 * Start the file watcher.
 * On new file in at /allure-results mounted path,
 * 1. Upload files to cloud storage if STORAGE_BUCKET is provided
 * 2. Move files to STAGING_PATH and set ttl for hosting if WEBSITE_ID is provided
 */
function main(): void {
    counter.startTimer()
    if (!cloudStorage && !websiteId) {
        console.warn('WEBSITE_ID or STORAGE_BUCKET is required');
        return
    }
    process.env.FIREBASE_PROJECT_ID = getProjectIdFromCredentialsFile()

    if (watchMode) {
        //
        chokidar.watch('/allure-results', {
            ignored: '^(?!.*\\.(json|png|jpeg|jpg|gif|properties|log|webm)$).*$',
            persistent: true,
            awaitWriteFinish: true,
            usePolling: true, // Avoid unnecessary polling
            depth: 2, // Limit recursive depth
        }).on('add', (filePath: string) => {
            // console.log(`New result file: ${filePath}`);
            if (websiteId) {
                (async () => {
                    await ReportBuilder.stageFiles([filePath])
                    ReportBuilder.setTtl()
                })()
            }
            if(cloudStorage){
                (async () => {
                    await cloudStorage.uploadFiles([filePath])
                })()
            }
        });
        console.log(`Waiting for new files at ${MOUNTED_PATH}`);
    } else {

        (async () => {
            let url
            if(websiteId){
                // Stage files, generateAndHost then upload history if enabled
                await Promise.all([
                    ReportBuilder.stageFiles(getAllFilesStream(MOUNTED_PATH)),
                    cloudStorage?.stageRemoteFiles()
                ])
                await ReportBuilder.generate()
                url = await ReportBuilder.host()
                if(keepHistory){
                    await cloudStorage?.uploadHistory()
                }

            }
            if (cloudStorage && keepRetires) {
                // While it makes sense to kick off Uploads while generating Allure reports,
                //since they dont depend on each other, there sean to be a lock problem when done
                // concurrently. Started after implementing p-limit in file upload
                await cloudStorage.uploadResults()
            }

            const summaryPath = process.env.GITHUB_SUMMARY_FILE
            if(url && summaryPath){
                writeGitHubSummary({summaryPath, url})
            }

        })()

    }
    if (!websiteId) {
        console.log('Report publishing disabled because WEBSITE_ID is not provided');
    }
    if (cloudStorage) {
        if (keepHistory && keepRetires) {
            console.log(`KEEP_HISTORY and KEEP_RETRIES enabled`)
        } else if (!keepHistory && !keepRetires) {
            console.log(`KEEP_HISTORY and KEEP_RETRIES disabled`)
        } else if (keepHistory) {
            console.log(`KEEP_HISTORY enabled`)
        } else if (keepRetires) {
            console.log(`KEEP_RETRIES enabled`)
        }
    } else {
        console.log('STORAGE_BUCKET is not provided, KEEP_HISTORY and KEEP_RETRIES disabled');
    }
}

if (require.main === module) {
    main()
}