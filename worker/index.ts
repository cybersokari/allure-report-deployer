import * as chokidar from 'chokidar';
import {
    getProjectIdFromCredentialsFile,
} from "./app/util";
import ReportBuilder from "./app/report-builder";
import {CloudStorage} from "./app/cloud-storage";

export const MOUNTED_PATH = '/allure-results'
export const HOME_DIR = process.env.WORK_DIR
export const STAGING_PATH = `${HOME_DIR}/allure-results`;
const storageBucket = process.env.STORAGE_BUCKET
export const websiteId = process.env.WEBSITE_ID;

/**
 * Download remote files if WEBSITE_ID is provided.
 * Start the file watcher.
 * On new file in at /allure-results mounted path,
 * 1. Upload files to cloud storage if STORAGE_BUCKET is provided
 * 2. Move files to STAGING_PATH and set ttl for hosting if WEBSITE_ID is provided
 */
function main(): void {
    if(!storageBucket && !websiteId){
        console.warn('WEBSITE_ID or STORAGE_BUCKET is required');
        return
    }
    process.env.FIREBASE_PROJECT_ID = getProjectIdFromCredentialsFile()
    const storage :  CloudStorage | null = storageBucket ? new CloudStorage(storageBucket) : null;

    if(process.env.WATCH_MODE?.toLowerCase().trim() === 'true' && process.env.CI !== 'true'){
        //
        if(websiteId && storage) {
            storage.downloadRemoteFilesToStaging()
        }
        chokidar.watch('/allure-results', {
            ignored: '^(?!.*\\.(json|png|jpeg|jpg|gif|properties|log|webm)$).*$',
            persistent: true,
            awaitWriteFinish: true
        }).on('add', (filePath) => {
            console.log(`New result file: ${filePath}`);
            storage?.uploadToFirebaseStorage(filePath)
            if(websiteId){
                ReportBuilder.moveFileToStaging(filePath)
                ReportBuilder.setTtl()
            }
        });
        console.log('Waiting for new files at /allure-results ...');
    } else {
        // Run job once
        ReportBuilder.moveFilesToStaging(MOUNTED_PATH)
        ReportBuilder.buildReport()
    }
    if(!websiteId){
        console.log('Report publishing disabled because WEBSITE_ID is null ');
    }
    if(!storageBucket){
        console.log('Cloud storage file upload disabled because STORAGE_BUCKET is null ');
    }

}

if(require.main === module){
    main()
}