import {ArgsInterface} from "../../src";

export const fakeArgs : ArgsInterface = {

    firebaseProjectId: 'credentials.projectId',
    storageBucket: 'bucket',
    websiteId: 'dd-site',
    websiteExpires: "9d",
    keepHistory: true,
    keepResults: true,
    ARCHIVE_DIR: '/app/archive',
    HOME_DIR: "/app",
    RESULTS_PATH: '/allure-results',
    REPORTS_DIR: "/app/allure-reports",
    RESULTS_STAGING_PATH: "/app/allure-results",
    fileProcessingConcurrency: 10,
    showHistory: true,
    showRetries: true,
    downloadRequired: true,
    uploadRequired: true,
}