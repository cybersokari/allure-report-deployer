export interface ArgsInterface {
    storageBucket?: string;
    prefix?: string;
    reportName?: string;
    websiteExpires?: string;
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
    runtimeCredentialDir: string
    slack_channel?: string
    slack_token?: string
    buildUrl?: string;
    updatePr?: GitHubPRUpdateType;
}
export enum GitHubPRUpdateType {
    comment,
    summary
}
