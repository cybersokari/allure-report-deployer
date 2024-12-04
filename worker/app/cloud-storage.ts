import * as path from "node:path";
import * as fs from "fs"
import {keepHistory, keepRetires, STAGING_PATH} from "../index";
import * as admin from "firebase-admin";
import {Bucket} from '@google-cloud/storage'
import {getAllFiles} from "./util";

const storageHomeDir = 'allure-results'

export class CloudStorage {
    private bucket: Bucket;

    constructor(storageBucket: string) {
        this.bucket = admin.initializeApp({storageBucket: storageBucket}).storage().bucket();
    }

    public async uploadFileToStorage(filePath: string): Promise<void> {
        let destinationFilePath: string
        if (filePath.includes('/history/')) {
            destinationFilePath = 'history/'.concat(path.basename(filePath))
        } else {
            destinationFilePath = path.basename(filePath);
        }
        try {
            await this.bucket.upload(filePath, {
                validation: process.env.CI === 'true',
                destination: `${storageHomeDir}/${destinationFilePath}`,
            });
        } catch (error) {
            console.error(`Failed to upload ${filePath}:`, error);
        }
    }

    public async downloadRemoteFilesToStaging({historyOnly = false}): Promise<void> {
        try {
            const [files] = await this.bucket.getFiles({prefix: historyOnly ? `${storageHomeDir}/history/` : `${storageHomeDir}/`});
            try {
                fs.mkdirSync(STAGING_PATH); // This should already exist from the image if the step is intact
            } catch (e) {
            }

            for (let file of files) {
                // Remove the preceding storageHomeDir path from the downloaded file
                const destination = path.join(STAGING_PATH, file.name.replace(`${storageHomeDir}/`, ''));
                await file.download({destination, validation: process.env.CI === 'true'});
                console.log(`Downloaded ${file.name}`);
            }
        } catch (error) {
            console.error('Download error:', error);
        }
    }

    public async uploadResultsToStorage() {
        let path: string | undefined
        if (keepHistory && keepRetires) {
            path = STAGING_PATH
            console.log(`Keeping history and retries`)
        } else if (keepRetires && !keepHistory) {
            fs.rmSync(`${STAGING_PATH}/history`, {force: true})
            path = STAGING_PATH
            console.log(`Keeping results for retries and discarding history`)
        } else if (!keepRetires && keepHistory) {
            path = `${STAGING_PATH}/history`
            console.log(`Keeping history and ignoring results`)
        }
        if (!path) return // KeepHistory && KeepRetries are false
        const files = getAllFiles(path)
        if (files.length > 0) {
            console.log(`Uploading ${files.length} files to storage`)
        }
        for (const file of files) {
            await this.uploadFileToStorage(file)
        }
    }
}