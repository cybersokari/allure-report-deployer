import * as path from "node:path";
import {
    DEBUG, fileProcessingConcurrency,
    keepHistory,
    keepResults,
    MOUNTED_PATH,
    REPORTS_DIR,
    STAGING_PATH, websiteId
} from "./constant";
import * as admin from "firebase-admin";
import {Bucket} from '@google-cloud/storage'
import {countFiles, unzipFile, zipFolder} from "./util";
import counter from "./counter";
import pLimit from "p-limit";
import * as fs from 'fs/promises'


const storageHomeDir = process.env.PREFIX || ''
/**
 * CloudStorage Class
 *
 * Handles file upload and management for cloud-based storage (e.g., Firebase Storage).
 * Provides methods for staging files, uploading files, and maintaining history or retries
 * as required.
 */
export class CloudStorage {
    public static bucket: Bucket
    public static instance: CloudStorage

    public static getInstance(storageBucket: string) {
        if (!CloudStorage.instance) {
            CloudStorage.bucket = admin.initializeApp({storageBucket: storageBucket}).storage().bucket();
            CloudStorage.instance = new CloudStorage()
        }
        return CloudStorage.instance
    }

    private async uploadFile(filePath: string, destinationFilePath: string) {
        await CloudStorage.bucket.upload(filePath, {
            validation: !DEBUG,
            destination: `${storageHomeDir}/${destinationFilePath}`,
        });
    }

    // Download remote files to staging area
    public async stageFilesFromStorage(): Promise<any> {
        try {
            const [files] = await CloudStorage.bucket.getFiles({prefix: `${storageHomeDir}/`, matchGlob: '*.zip'});
            const limit = pLimit(fileProcessingConcurrency);
            const downloadPromises = [];
            for (const file of files) {
                downloadPromises.push(limit(async () => {
                    // Remove the preceding storageHomeDir path from the downloaded file
                    const destination = path.join(STAGING_PATH, path.basename(file.name));
                    await file.download({destination, validation: !DEBUG});
                    if(destination.endsWith('.zip')){
                        await unzipFile(destination, STAGING_PATH);
                        await fs.rm(destination, {force: true });
                    }
                }))
            }
            await Promise.all(downloadPromises);
        } catch (error) {
            console.error('Download to staging error:', error);
        }
    }

    /**
     * Zip and upload mounted results and generated report history (if enabled)
     */
    public async uploadArtifacts() {
        const foldersToBackup: {path: string, destination?: string}[] = []
        const historyFolder = `${REPORTS_DIR}/history`
        if (keepResults) {
            foldersToBackup.push({path: MOUNTED_PATH})
        }
        if (websiteId && keepHistory) {
            foldersToBackup.push({path: historyFolder, destination: 'history'})
        }
        const isoString = new Date().toISOString().replace(/(\.\d{3})?Z$/, ''); // Remove milliSec and TZ
        const outputFileName = isoString.concat('.zip')
        await zipFolder(foldersToBackup, outputFileName)
        // Count while uploading
        await Promise.all([
            counter.addFilesUploaded(await countFiles([historyFolder, MOUNTED_PATH])),
            this.uploadFile(outputFileName, outputFileName)
        ])
    }
}