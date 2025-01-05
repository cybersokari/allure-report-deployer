import * as path from "node:path";
import {countFiles, isFileTypeAllure, zipFolder} from "../utilities/util.js";
import {counter} from "../utilities/counter.js";
import pLimit from "p-limit";
import {StorageProvider} from "../interfaces/storage-provider.interface.js";
import fs from "fs/promises";
import fsSync from "fs";
import unzipper, {Entry} from "unzipper";
import {ArgsInterface} from "../interfaces/args.interface.js";
import {UnzipperProvider} from "../interfaces/unzipper.interface.js";


export class Storage {
    private provider: StorageProvider;
    private args: ArgsInterface;
    private unzipper: UnzipperProvider; // Injected UnzipperProvider

    constructor(provider: StorageProvider, args: ArgsInterface) {
        this.provider = provider;
        this.args = args;
        this.unzipper = unzipper;
    }

    // Download remote files to staging area
    public async stageFilesFromStorage(): Promise<any> {
        // Create directories for staging
        await Promise.all([
            await fs.mkdir(`${this.args.RESULTS_STAGING_PATH}/history`, {recursive: true}),
            await fs.mkdir(this.args.ARCHIVE_DIR, {recursive: true})
        ])
        const localFilePaths = await this.provider.download({
            prefix: this.args.prefix ?? '',
            destination: this.args.ARCHIVE_DIR
        })
        const limit = pLimit(this.args.fileProcessingConcurrency);
        const unzipPromises = [];
        for (const filePath of localFilePaths) {
            unzipPromises.push(limit(async () => {
                try {
                    await this.unzipAllureResult(filePath, this.args.RESULTS_STAGING_PATH);
                } catch (e) {
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

        foldersToBackup.push({path: this.args.RESULTS_PATH})
    	foldersToCount.push(this.args.RESULTS_PATH)

        const historyFolder = `${this.args.REPORTS_DIR}/history`
        foldersToBackup.push({path: historyFolder, destination: 'history'})
        foldersToCount.push(historyFolder)

        const outputFileName = path.join(this.args.ARCHIVE_DIR, Date.now().toString().concat('.zip'))
        await zipFolder(foldersToBackup, outputFileName)
        const cloudStorageFilePath = path.join(this.args.prefix ?? '', path.basename(outputFileName))
        // Count while uploading
        await Promise.all([
            counter.addFilesUploaded(await countFiles(foldersToCount)),
            this.provider.upload(outputFileName, cloudStorageFilePath)
        ])
    }

    public async unzipAllureResult(zipFilePath: string, outputDir: string): Promise<boolean> {
        return await new Promise((resolve, reject) => {
            fsSync.createReadStream(zipFilePath)
                .pipe(this.unzipper.Parse())
                .on('entry', async (entry: Entry) => {
                    const fullPath = path.join(outputDir, entry.path);
                    if (!this.args.showHistory) {
                        // Ignore the history subdirectory
                        if (entry.path.includes('history/')) {
                            entry.autodrain();
                            return;
                        }
                    }
                    if (!this.args.showRetries) {
                        if (!entry.path.includes('history/')) {
                            entry.autodrain();
                            return;
                        }
                    }
                    if (isFileTypeAllure(entry.path)) {
                        entry.pipe(fsSync.createWriteStream(fullPath));
                    } else {
                        entry.autodrain();
                    }
                })
                .on('close', () => {
                    resolve(true);
                })
                .on('error', (err) => {
                    console.warn('Unzip file error');
                    reject(err)
                });
        });
    }

}