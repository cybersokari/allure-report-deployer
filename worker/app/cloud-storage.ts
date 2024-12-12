import * as path from "node:path";
import {
    DEBUG,
    fileProcessingConcurrency,
    keepHistory,
    keepResults,
    MOUNTED_PATH,
    REPORTS_DIR,
    showHistory,
    showRetries,
    RESULTS_STAGING_PATH,
    websiteId, ARCHIVE_DIR
} from "./constant";
import * as admin from "firebase-admin";
import {Bucket, File} from '@google-cloud/storage'
import {countFiles, unzipFile, zipFolder} from "./util";
import counter from "./counter";
import pLimit from "p-limit";



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
    private storageHomeDir = process.env.PREFIX ? `${process.env.PREFIX}/` : undefined

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
            destination: `${this.storageHomeDir}${destinationFilePath}`,
        });
    }

    // Download remote files to staging area
    public async stageFilesFromStorage(): Promise<any> {
        if (!showHistory && !showRetries) return

        try {
            let [zippedFiles] = await CloudStorage.bucket.getFiles({prefix: this.storageHomeDir, matchGlob: '**.zip'});
            if (showHistory) {
                // Unzipping from the oldest to newest archive makes sure
                // the archive with the latest history files gets unzipped last
                // and overwrites any old history from in the staging directory.
                zippedFiles = this.sortFilesByOldestToNewest(zippedFiles)
            }

            const limit = pLimit(fileProcessingConcurrency);
            const downloadPromises = [];
            for (const file of zippedFiles) {
                downloadPromises.push(limit(async () => {
                    // Remove the preceding storageHomeDir path from the downloaded file
                    const archiveDestination = path.join(ARCHIVE_DIR, path.basename(file.name));
                    // console.log(`Downloading ${file.name} to ${destination}`)
                    await file.download({destination: archiveDestination, validation: !DEBUG});
                    await unzipFile(archiveDestination, RESULTS_STAGING_PATH);
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
        const foldersToBackup: { path: string, destination?: string }[] = []
        const historyFolder = `${REPORTS_DIR}/history`
        const foldersToCount = []
        if (keepResults) {
            foldersToBackup.push({path: MOUNTED_PATH})
            foldersToCount.push(MOUNTED_PATH)
        }
        if (websiteId && keepHistory) {
            foldersToBackup.push({path: historyFolder, destination: 'history'})
            foldersToCount.push(historyFolder)
        }
        const isoString = new Date().toISOString().replace(/(\.\d{3})?Z$/, ''); // Remove milliSec and TZ
        const outputFileName = path.join(ARCHIVE_DIR, isoString.concat('.zip'))
        await zipFolder(foldersToBackup, outputFileName)
        // Count while uploading
        await Promise.all([
            counter.addFilesUploaded(await countFiles(foldersToCount)),
            this.uploadFile(outputFileName, path.basename(outputFileName))
        ])
    }

    private sortFilesByOldestToNewest(files: File[]): File[] {
        if (!files || files.length < 2) {
            return files;
        }
        // Filter out files without valid `timeCreated` metadata
        files = files.filter(file => file.metadata?.timeCreated);
        // Sort files by creation time (oldest first)
        return files.sort((a, b) =>
            new Date(a.metadata.timeCreated!).getTime() - new Date(b.metadata.timeCreated!).getTime()
        );
    }
}