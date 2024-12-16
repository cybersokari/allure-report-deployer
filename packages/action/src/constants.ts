import { ArgsInterface } from "@allure/shared";
import { ActionsCredentials } from "./credentials.js";

export function getArgs(credentials: ActionsCredentials): ArgsInterface {
    const keepHistory = process.env.KEEP_HISTORY === "true";
    const keepResults = process.env.KEEP_RESULTS === "true";
    const uploadRequired = keepResults || keepHistory;
    const showHistory = process.env.SHOW_HISTORY === "true";
    const showRetries = process.env.SHOW_RETRIES === "true";
    const downloadRequired = showRetries || showHistory;

    return {
        firebaseProjectId: credentials.projectId,
        storageBucket: process.env.STORAGE_BUCKET || undefined,
        websiteId: process.env.WEBSITE_ID || undefined,
        websiteExpires: process.env.WEBSITE_EXPIRES || "7d",
        keepHistory: keepHistory,
        keepResults: keepResults,
        ARCHIVE_DIR: '/app/archive',
        HOME_DIR: "/app",
        MOUNTED_PATH: process.env.ALLURE_RESULTS_PATH!,
        REPORTS_DIR: "/app/allure-reports",
        RESULTS_STAGING_PATH: "/app/allure-results",
        fileProcessingConcurrency: 10,
        showHistory: showHistory,
        showRetries: showRetries,
        downloadRequired: downloadRequired,
        uploadRequired: uploadRequired,
    };
}