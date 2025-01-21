/**
 * Interface for managing the staging, uploading, and unzipping of files
 * from a remote storage.
 */
export interface IStorage {
    stageFilesFromStorage(): Promise<void>;

    /**
     * Zips and uploads results and report history to the remote storage.
     * Includes error handling for failed uploads.
     */
    uploadArtifacts(): Promise<void>;

    /**
     * Extracts the contents of a ZIP file into the specified directory.
     * Only extracts files that match the Allure file type pattern.
     *
     * @param zipFilePath - Path to the ZIP file to extract
     * @param outputDir - Directory where the contents should be extracted
     * @returns Promise that resolves to true when extraction is complete
     */
    unzipToStaging(zipFilePath: string, outputDir: string): Promise<boolean>;
}