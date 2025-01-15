import {ArgsInterface} from "../../src/interfaces/args.interface.js";

export const fakeArgs : ArgsInterface = {
    runtimeCredentialDir: "",
    firebaseProjectId: 'credentials.projectId',
    storageBucket: 'bucket',
    reportName: 'dd-site',
    ARCHIVE_DIR: '/app/archive',
    HOME_DIR: "/app",
    RESULTS_PATHS: ['/allure-results'],
    REPORTS_DIR: "/app/allure-reports",
    RESULTS_STAGING_PATH: "/app/allure-results",
    fileProcessingConcurrency: 10,
    showHistory: true,
    retries: 10,
    downloadRequired: true,
    uploadRequired: true,
}