import {REPORTS_DIR} from "./report-builder";
import * as fs from "fs/promises";
import * as fsSync from 'fs'
import {RESULTS_PATH} from "../index";
import * as path from "node:path";
import * as admin from "firebase-admin";

// Firebase configuration
admin.initializeApp({storageBucket: process.env.STORAGE_BUCKET});
export const bucket = admin.storage().bucket();

export async function createFirebaseJson(site: string) {
    const hosting = {
        "hosting": {
            "public": ".",
            "site": site,
            "ignore": [
                "firebase.json",
                "**/.*",
            ]
        }
    }
    try {
        const configDir = `${REPORTS_DIR}/firebase.json`
        await fs.writeFile(configDir, JSON.stringify(hosting), {mode: 0o755, encoding: 'utf-8'} )
        return configDir
    }catch (e) {
        console.info(`firebase.json write failed: ${e}`)
        throw e
    }
}

export async function uploadToFirebaseStorage(filePath: string): Promise<void> {
    try {
        await bucket.upload(filePath, {
            validation: false,
            destination: `allure-results/${path.basename(filePath)}`,
        });
        console.log(`Uploaded ${filePath} to Firebase Storage`);
    } catch (error) {
        console.error('Upload error:', error);
    }
}

export async function downloadFromRemote(): Promise<void> {
    try {
        const [files] = await bucket.getFiles({ prefix: 'allure-results/' });
        try {
            await fs.mkdir(RESULTS_PATH, { recursive: true });
        }catch (e) {}

        for (let file of files) {
            const destination = path.join(RESULTS_PATH, file.name.replace('allure-results/', ''));
            await file.download({ destination, validation: false });
            console.log(`Downloaded ${file.name}`);
        }
    } catch (error) {
        console.error('Download error:', error);
    }
}

export async function saveResultFileToStaging(sourceFilePath: any){
    try {
        const destinationFilePath = path.join(RESULTS_PATH, path.basename(sourceFilePath));
        fsSync.mkdirSync(path.dirname(destinationFilePath), { recursive: true });
        fsSync.copyFileSync(sourceFilePath, destinationFilePath);
    }catch (e) {
        console.warn(`Failed to move ${path.basename(sourceFilePath)} to staging area: ${e}`)
    }
}

export async function changePermissionsRecursively(dirPath: string, mode: fsSync.Mode) {
    await fs.chmod(dirPath, mode);

    const files = await fs.readdir(dirPath);

    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
            await changePermissionsRecursively(fullPath, mode);
        } else {
            await fs.chmod(fullPath, mode);
        }
    }
}

export const setFirebaseProjectIdToEnv = () => {
    try {
        const credentialsContent = JSON.parse(
            fsSync.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS!, 'utf8')
        );
        process.env.FIREBASE_PROJECT_ID = credentialsContent.project_id
    } catch (error) {
        console.error('Error reading credentials:', error);
        throw error;
    }
}

export function logError(...e: any){
    console.log(e)
}




