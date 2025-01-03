import {ArgsInterface} from "../../src/interfaces/args.interface.js";

export const fakeArgs : ArgsInterface = {
    runtimeCredentialDir: "",
    firebaseProjectId: 'credentials.projectId',
    storageBucket: 'bucket',
    reportName: 'dd-site',
    websiteExpires: "9d",
    ARCHIVE_DIR: '/app/archive',
    HOME_DIR: "/app",
    RESULTS_PATH: '/allure-results',
    REPORTS_DIR: "/app/allure-reports",
    RESULTS_STAGING_PATH: "/app/allure-results",
    fileProcessingConcurrency: 10,
    showHistory: true,
    showRetries: true,
    downloadRequired: true,
    uploadRequired: true
}