import * as path from "node:path";
import {
    fileProcessingConcurrency,
    keepHistory,
    keepResults,
    MOUNTED_PATH,
    REPORTS_DIR,
    RESULTS_STAGING_PATH,
    websiteId, ARCHIVE_DIR
} from "../utilities/constant.js";
import {countFiles, unzipAllureResult, zipFolder} from "../utilities/util.js";
import counter from "../utilities/counter.js";
import pLimit from "p-limit";
import {StorageProvider} from "../interfaces/storage-provider.interface.js";
import fs from "fs/promises";


export class Storage {
    private provider: StorageProvider;

    constructor(provider: StorageProvider) {
        this.provider = provider;
    }
    private storageHomeDir = process.env.PREFIX || ''

    // Download remote files to staging area
    public async stageFilesFromStorage(): Promise<any> {
        // Create directories for staging
        await Promise.all([
            await fs.mkdir(`${RESULTS_STAGING_PATH}/history`, {recursive: true}),
            await fs.mkdir(ARCHIVE_DIR, {recursive: true})
        ])
        const localFilePaths = await this.provider.download({prefix: this.storageHomeDir, destination: ARCHIVE_DIR})
        const limit = pLimit(fileProcessingConcurrency);
        const unzipPromises = [];
        for (const filePath of localFilePaths) {
            unzipPromises.push(limit(async () => {
                try {
                    await unzipAllureResult(filePath, RESULTS_STAGING_PATH);
                }catch (e) {
                    console.warn('Unzip from remote error:', e);
                }
            }))
        }
        await Promise.all(unzipPromises);
    }

    /**
     * Zip and upload mounted results and generated report history (if enabled)
     */
    public async uploadArtifacts() {
        const foldersToBackup: { path: string, destination?: string }[] = []
        const foldersToCount = []
        if (keepResults) {
            foldersToBackup.push({path: MOUNTED_PATH})
            foldersToCount.push(MOUNTED_PATH)
        }
        if (websiteId && keepHistory) {
            const historyFolder = `${REPORTS_DIR}/history`
            foldersToBackup.push({path: historyFolder, destination: 'history'})
            foldersToCount.push(historyFolder)
        }
        const isoString = new Date().toISOString().replace(/(\.\d{3})?Z$/, ''); // Remove milliSec and TZ
        const outputFileName = path.join(ARCHIVE_DIR, isoString.concat('.zip'))
        await zipFolder(foldersToBackup, outputFileName)
        // Count while uploading
        await Promise.all([
            counter.addFilesUploaded(await countFiles(foldersToCount)),
            this.provider.upload(outputFileName, path.basename(outputFileName))
        ])
    }

}