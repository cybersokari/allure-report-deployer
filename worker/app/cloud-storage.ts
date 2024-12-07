import * as path from "node:path";
import * as fs from "fs/promises"
import {DEBUG, MOUNTED_PATH, REPORTS_DIR, STAGING_PATH} from "../index";
import * as admin from "firebase-admin";
import {Bucket} from '@google-cloud/storage'
import {getAllFilesStream} from "./util";
import counter from "./counter";
import pLimit from "p-limit";

const storageHomeDir = 'allure-results'

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

    public async uploadFiles(files: AsyncGenerator<string> | string[], concurrency = 5): Promise<void> {
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
                    console.log(`Uploading ${destinationFilePath} to storage`)
                    await CloudStorage.bucket.upload(filePath, {
                        validation: !DEBUG,
                        destination: `${storageHomeDir}/${destinationFilePath}`,
                    });
                    await counter.incrementFilesUploaded()
                } catch (error) {
                    console.error(`Failed to upload ${filePath}:`, error);
                }
            }))
        }
        await Promise.all(tasks);
    }

    // Download remote files to staging area
    public async stageRemoteFiles(concurrency= 5): Promise<any> {
        try {
            const [files] = await CloudStorage.bucket.getFiles({prefix: `${storageHomeDir}/`});
            if (!files.length) {
                console.log(`No files found in folder: ${storageHomeDir}/`);
                return;
            }
            await fs.mkdir(STAGING_PATH, {recursive: true}); // recursive, dont throw if exist
            const limit = pLimit(concurrency);
            const downloadPromises = [];
            for (const file of files) {
                downloadPromises.push(limit(async () => {
                    // Remove the preceding storageHomeDir path from the downloaded file
                    const destination = path.join(STAGING_PATH, file.name.replace(`${storageHomeDir}/`, ''));
                    await file.download({destination, validation: !DEBUG});
                    console.log(`Downloaded ${file.name}`);
                }))
            }
            await Promise.all(downloadPromises);
        } catch (error) {
            console.error('Download error:', error);
        }
    }

    /**
     * Upload history from generated reports
     */
    public async uploadHistory(): Promise<any> {
        const files = getAllFilesStream(`${REPORTS_DIR}/history`);
        await this.uploadFiles(files)
    }

    public async uploadResults() {
        // try to delete any history file in STAGING_PATH/history
        // await fs.rm(`${STAGING_PATH}/history`, {recursive: true,force: true});
        const files = getAllFilesStream(MOUNTED_PATH)
        await this.uploadFiles(files)
    }
}