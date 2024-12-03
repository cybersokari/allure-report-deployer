import * as path from "node:path";
import * as fs from "fs/promises";
import {STAGING_PATH} from "../index";
import * as admin from "firebase-admin";
import {Bucket} from '@google-cloud/storage'

export class CloudStorage {
    private bucket : Bucket;
    constructor(storageBucket: string) {
        this.bucket = admin.initializeApp({storageBucket: storageBucket}).storage().bucket();
    }

    public async uploadToFirebaseStorage(filePath: string): Promise<void> {
        try {
            await this.bucket.upload(filePath, {
                validation: false,
                destination: `allure-results/${path.basename(filePath)}`,
            });
        } catch (error) {
            console.error(`Failed to upload ${filePath}:`, error);
        }
    }

    public async downloadRemoteFilesToStaging(): Promise<void> {
        try {
            const [files] = await this.bucket.getFiles({ prefix: 'allure-results/' });
            try {
                await fs.mkdir(STAGING_PATH, { recursive: true });
            }catch (e) {}

            for (let file of files) {
                const destination = path.join(STAGING_PATH, file.name.replace('allure-results/', ''));
                await file.download({ destination, validation: false });
                console.log(`Downloaded ${file.name}`);
            }
        } catch (error) {
            console.error('Download error:', error);
        }
    }
}