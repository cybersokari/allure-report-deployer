import * as path from "node:path";
import * as fs from "fs/promises"
import {keepHistory, REPORTS_DIR, STAGING_PATH} from "../index";
import * as admin from "firebase-admin";
import {Bucket} from '@google-cloud/storage'
import {getAllFiles} from "./util";

const storageHomeDir = 'allure-results'

export class CloudStorage {
    private bucket: Bucket;

    constructor(storageBucket: string) {
        this.bucket = admin.initializeApp({storageBucket: storageBucket}).storage().bucket();
    }

    public async uploadFiles(files: string[]): Promise<void> {
        for (const filePath of files) {
            let destinationFilePath: string
            if (filePath.includes('history/')) {
                destinationFilePath = 'history/'.concat(path.basename(filePath))
            } else {
                destinationFilePath = path.basename(filePath);
            }
            try {
                console.log(`Uploading ${destinationFilePath} to storage`)
                await this.bucket.upload(filePath, {
                    validation: process.env.DEBUG !== 'true',
                    destination: `${storageHomeDir}/${destinationFilePath}`,
                });
            } catch (error) {
                console.error(`Failed to upload ${filePath}:`, error);
            }
        }
    }

    // Download remote files to staging area
    public async stageRemoteFiles(): Promise<any> {
        try {
            const [files] = await this.bucket.getFiles({prefix: `${storageHomeDir}/`});

            await fs.mkdir(STAGING_PATH, {recursive: true}); // recursive, dont throw is exist

            for (const file of files) {
                // Remove the preceding storageHomeDir path from the downloaded file
                const destination = path.join(STAGING_PATH, file.name.replace(`${storageHomeDir}/`, ''));
                await file.download({destination, validation: process.env.DEBUG !== 'true'});
                console.log(`Downloaded ${file.name}`);
            }
            return files
        } catch (error) {
            console.error('Download error:', error);
            return error
        }
    }

    /**
     * Upload history from generated reports
     */
    public async uploadHistory(): Promise<any> {
        const files = await getAllFiles(`${REPORTS_DIR}/history`);
        if (files.length > 0) {
            await this.uploadFiles(files)
        }
    }

    public async uploadResults() {
        if (!keepHistory) {
            // try to delete any history file in STAGING_PATH/history
            await fs.rm(`${STAGING_PATH}/history`, {force: true})
        }
        const files = await getAllFiles(STAGING_PATH)
        if (files.length > 0) {
            await this.uploadFiles(files)
        }
    }
}