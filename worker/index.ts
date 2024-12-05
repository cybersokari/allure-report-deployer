import * as chokidar from 'chokidar';
import {
    getAllFiles,
    getProjectIdFromCredentialsFile,
} from "./app/util";
import ReportBuilder from "./app/report-builder";
import {CloudStorage} from "./app/cloud-storage";

export const MOUNTED_PATH = '/allure-results'
export const HOME_DIR = '/app'
export const STAGING_PATH = `${HOME_DIR}/allure-results`;
export const websiteId = process.env.WEBSITE_ID;
export const keepHistory = process.env.KEEP_HISTORY?.toLowerCase() === 'true'
export const keepRetires = process.env.KEEP_RETRIES?.toLowerCase() === 'true'
export const cloudStorage  =  process.env.STORAGE_BUCKET ? new CloudStorage(process.env.STORAGE_BUCKET) : null;

/**
 * Download remote files if WEBSITE_ID is provided.
 * Start the file watcher.
 * On new file in at /allure-results mounted path,
 * 1. Upload files to cloud storage if STORAGE_BUCKET is provided
 * 2. Move files to STAGING_PATH and set ttl for hosting if WEBSITE_ID is provided
 */
function main(): void {
    if(!cloudStorage && !websiteId){
        console.warn('WEBSITE_ID or STORAGE_BUCKET is required');
        return
    }
    process.env.FIREBASE_PROJECT_ID = getProjectIdFromCredentialsFile()

    if(process.env.WATCH_MODE?.toLowerCase() === 'true' && process.env.CI !== 'true'){
        //
        chokidar.watch('/allure-results', {
            ignored: '^(?!.*\\.(json|png|jpeg|jpg|gif|properties|log|webm)$).*$',
            persistent: true,
            awaitWriteFinish: true
        }).on('add', (filePath: string) => {
            console.log(`New result file: ${filePath}`);
            // Upload file async if storage is enabled
            cloudStorage?.uploadFileToStorage(filePath)
            if(websiteId){
                ReportBuilder
                    .stageFiles([filePath])
                    .then((rb)=> rb.setTtl())
            }
        });
        console.log('Waiting for new files at /allure-results ...');
    } else {
        if(cloudStorage){
            (async ()=> {
                await Promise.all([
                    cloudStorage.stageRemoteFiles(),
                    ReportBuilder.stageFiles(getAllFiles(MOUNTED_PATH))
                ])
                await ReportBuilder.buildAndHost()
            })()
        } else {
            ReportBuilder.stageFiles(getAllFiles(MOUNTED_PATH))
                .then((rb)=> rb.buildAndHost())
        }
    }
    if(!websiteId){
        console.log('Report publishing disabled because WEBSITE_ID is null ');
    }
    if(!cloudStorage){
        console.log('Cloud storage file upload disabled because STORAGE_BUCKET is null');
        if(keepHistory){
            console.log('KEEP_HISTORY is ignored because STORAGE_BUCKET is null');
        }
        if(keepRetires){
            console.log('KEEP_RETRIES is ignored because STORAGE_BUCKET is null');
        }
    }
}

if(require.main === module){
    main()
}