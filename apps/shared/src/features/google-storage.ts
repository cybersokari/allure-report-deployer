import * as path from "node:path";
import {archiveFilesInDirectories} from "../utilities/util.js";
import pLimit from "p-limit";
import {Order, StorageProvider} from "../interfaces/storage-provider.interface.js";
import fs from "fs/promises";
import fsSync from "fs";
import unzipper, {Entry} from "unzipper";
import {UnzipperProvider} from "../interfaces/unzipper.interface.js";
import {GoogleStorageService} from "../services/google-storage.service.js";
import {IStorage} from "../interfaces/storage.interface.js";

const HISTORY_ARCHIVE_NAME = "last-history.zip";
const RESULTS_ARCHIVE_GLOB_MATCH = '[0-9]*.zip';


export interface GoogleStorageConfig {
    fileProcessingConcurrency: number;
    clean: boolean;
    showHistory: boolean;
    retries: number;
    RESULTS_PATHS: string[];
    RESULTS_STAGING_PATH: string;
    ARCHIVE_DIR: string;
    REPORTS_DIR: string;
}

/**
 * The Storage class manages the staging, uploading, and unzipping of files
 * from a remote Google Cloud Storage bucket.
 */
export class GoogleStorage implements IStorage{
    private provider: GoogleStorageService;
    private args: GoogleStorageConfig;
    private unzipper: UnzipperProvider;

    /**
     * Constructs a Storage instance.
     * @param provider - The storage provider to interact with cloud storage.
     * @param args - Arguments for file handling and configuration.
     * @param excludes Files names to exclude during backup
     */
    constructor(provider: StorageProvider, args: GoogleStorageConfig, readonly excludes: string[] = ['executor.json', 'environment.properties']) {
        this.provider = provider;
        this.args = args;
        this.unzipper = unzipper;
    }

    /**
     * Orchestrates downloading files from the remote storage to a local staging area.
     */
    public async stageFilesFromStorage(): Promise<void> {
        if (this.args.clean) {
            await this.cleanUpRemoteFiles();
        }

        await this.createStagingDirectories();

        const tasks: Promise<void>[] = [];

        if (this.args.showHistory) {
            tasks.push(this.stageHistoryFiles());
        }

        if (this.args.retries) {
            tasks.push(this.stageResultFiles(this.args.retries));
        }

        await Promise.all(tasks);
    }

    /**
     * Zips and uploads results and report history (if enabled) to the remote storage.
     */
    public async uploadArtifacts(): Promise<void> {
        try {
            await Promise.all([
                this.uploadNewResults(this.getResultsArchivePath()),
                this.uploadHistory(this.getHistoryArchivePath()),
            ]);
        } catch (error) {
            console.warn("Error uploading artifacts:", error);
        }
    }

    /**
     * Extracts the contents of a ZIP file into the specified directory.
     * @param zipFilePath - Path to the ZIP file.
     * @param outputDir - Directory to extract the contents into.
     * @returns A promise that resolves when extraction is complete.
     */
    public async unzipToStaging(zipFilePath: string, outputDir: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            fsSync.createReadStream(zipFilePath)
                .pipe(this.unzipper.Parse())
                .on("entry", async (entry: Entry) => {
                    const fullPath = path.posix.join(outputDir, entry.path);
                    entry.pipe(fsSync.createWriteStream(fullPath));
                })
                .on("close", () => resolve(true))
                .on("error", (err) => {
                    console.warn("Unzip file error");
                    reject(err);
                });
        });
    }

    // ============= Private Helper Methods =============

    /**
     * Deletes all files in the remote storage if the `clean` option is enabled.
     */
    private async cleanUpRemoteFiles(): Promise<void> {
        try {
            await this.provider.deleteFiles();
        } catch (error) {
            console.error("Error deleting files:", error);
        }
    }

    /**
     * Ensures the local directories exist.
     */
    private async createStagingDirectories(): Promise<void> {
        try {
            await Promise.allSettled([
                fs.mkdir(this.args.ARCHIVE_DIR, {recursive: true}),
                fs.mkdir(this.args.RESULTS_STAGING_PATH, {recursive: true})
            ])
        } catch (error) {
            console.error("Error creating archive directory:", error);
            throw error;
        }
    }

    /**
     * Downloads and stages the history archive.
     */
    private async stageHistoryFiles(): Promise<void> {
        const files = await this.provider.getFiles({
            maxResults: 1,
            matchGlob: `**/${HISTORY_ARCHIVE_NAME}`,
        });

        if (files.length === 0) {
            console.warn("No history files found to stage.");
            return;
        }

        const [downloadedPath] = await this.provider.download({
            files,
            destination: this.args.ARCHIVE_DIR,
        });

        const stagingDir = path.join(this.args.RESULTS_STAGING_PATH, "history");
        await fs.mkdir(stagingDir, {recursive: true});
        await this.unzipToStaging(downloadedPath, stagingDir);
    }

    /**
     * Stages the result files and deletes older files exceeding the retry limit.
     * @param retries - Maximum number of files to keep.
     */
    private async stageResultFiles(retries: number): Promise<void> {
        let files = await this.provider.getFiles({
            order: Order.byOldestToNewest,
            matchGlob: RESULTS_ARCHIVE_GLOB_MATCH,
        });

        const limit = pLimit(this.args.fileProcessingConcurrency);
        const tasks: Promise<void>[] = [];
        if (files.length > retries) {
            const filesToDelete = files.slice(0, files.length - retries);
            files = files.slice(files.length - retries);
            for (const file of filesToDelete) {
                tasks.push(limit(async () => {
                    try {
                        await this.provider.deleteFile(file.name);
                    } catch (error) {
                        console.warn("Delete file error:", error);
                    }
                }))
            }
        }

        const downloadedPaths = await this.provider.download({
            files,
            destination: this.args.ARCHIVE_DIR,
        });

        for (const filePath of downloadedPaths) {
            tasks.push(limit(async () => {
                await this.unzipToStaging(filePath, this.args.RESULTS_STAGING_PATH);
            }))
        }
        await Promise.allSettled(tasks);
    }

    /**
     * Returns the path for the results archive.
     */
    private getResultsArchivePath(): string {
        return path.join(this.args.ARCHIVE_DIR, `${Date.now()}.zip`);
    }

    /**
     * Returns the path for the history archive.
     */
    private getHistoryArchivePath(): string {
        return path.join(this.args.ARCHIVE_DIR, HISTORY_ARCHIVE_NAME);
    }

    /**
     * Returns the path for the history folder.
     */
    private getHistoryFolder(): string {
        return path.join(this.args.REPORTS_DIR, "history");
    }

    /**
     * Zips and uploads new results to the remote storage.
     * @param resultsArchivePath - Path to the results archive.
     */
    private async uploadNewResults(resultsArchivePath: string): Promise<void> {
        const source = []
        for (const filePath of this.args.RESULTS_PATHS) {
            source.push({path: filePath})
        }
        const resultsPath = await archiveFilesInDirectories({source, outputFilePath: resultsArchivePath, exclude: this.excludes});
        await this.provider.upload(resultsPath, path.basename(resultsPath));
    }

    /**
     * Zips and uploads the history archive to the remote storage.
     * @param historyArchivePath - Path to the history archive.
     */
    private async uploadHistory(historyArchivePath: string): Promise<void> {
        const source = [{path: this.getHistoryFolder()}]
        const historyPath = await archiveFilesInDirectories({source, outputFilePath: historyArchivePath});
        await this.provider.upload(historyPath, path.basename(historyPath));
    }
}