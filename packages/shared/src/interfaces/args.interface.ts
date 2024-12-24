export interface ArgsInterface {
    storageBucket?: string;
    prefix?: string;
    reportId: string;
    websiteExpires?: string;
    keepHistory?: boolean;
    keepResults?: boolean;
    showHistory?: boolean;
    showRetries?: boolean;
    HOME_DIR: string;
    RESULTS_STAGING_PATH: string;
    ARCHIVE_DIR: string;
    REPORTS_DIR: string;
    RESULTS_PATH: string;
    fileProcessingConcurrency: number;
    firebaseProjectId: string;
    uploadRequired: boolean;
    downloadRequired: boolean;
    v3?: boolean;
}
