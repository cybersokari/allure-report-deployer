import * as path from "node:path";
import {DEBUG, fileProcessingConcurrency, MOUNTED_PATH, REPORTS_DIR, STAGING_PATH} from "./constant";
import * as admin from "firebase-admin";
import {Bucket} from '@google-cloud/storage'
import {getAllFilesStream} from "./util";
import counter from "./counter";
import pLimit from "p-limit";

const prefix = process.env.PREFIX || undefined
const storageHomeDir = prefix ? `${prefix}/allure-results` : 'allure-results'
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

    public async uploadFiles(files: AsyncGenerator<string> | string[], {concurrency = 5}): Promise<void> {
        const limit = pLimit(concurrency);
        const tasks = [];
        for await (const filePath of files) {
            tasks.push(limit(async () => {
                let destinationFilePath: string
                if (filePath.includes('history/')) {
                    destinationFilePath = 'history/'.concat(path.basename(filePath))
                } else {
                    destinationFilePath = path.basename(filePath);
                }
                try {
                    // console.log(`Uploading ${destinationFilePath} to storage`)
                    await CloudStorage.bucket.upload(filePath, {
                        validation: !DEBUG,
                        destination: `${storageHomeDir}/${destinationFilePath}`,
                    });
                    await counter.incrementFilesUploaded()
                } catch (error) {
                    // console.error(`Failed to upload ${filePath}:`, error);
                }
            }))
        }
        await Promise.all(tasks);
    }

    // Download remote files to staging area
    public async stageRemoteFiles({concurrency = 5}): Promise<any> {
        try {
            const [files] = await CloudStorage.bucket.getFiles({prefix: `${storageHomeDir}/`});
            if (!files.length) {
                // console.log('No files to process from CloudStorage');
                return;
            }

            const limit = pLimit(concurrency);
            const downloadPromises = [];
            for (const file of files) {
                downloadPromises.push(limit(async () => {
                    // Remove the preceding storageHomeDir path from the downloaded file
                    const destination = path.join(STAGING_PATH, file.name.replace(`${storageHomeDir}/`, ''));
                    await file.download({destination, validation: !DEBUG});
                }))
            }
            await Promise.all(downloadPromises);
        } catch (error) {
            // console.error('Download error:', error);
        }
    }

    /**
     * Upload history from generated reports
     */
    public async uploadHistory() {
        const files = getAllFilesStream(`${REPORTS_DIR}/history`);
        await this.uploadFiles(files, {concurrency: fileProcessingConcurrency});
    }

    public async uploadResults() {
        const files = getAllFilesStream(MOUNTED_PATH)
        await this.uploadFiles(files, {concurrency: fileProcessingConcurrency});
    }
}