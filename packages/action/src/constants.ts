import {ArgsInterface} from "@allure/shared";
import core from "@actions/core";
import {ActionsCredentials} from "./credentials.js";

export function getArgs(credentials: ActionsCredentials): ArgsInterface {
    const keepHistory = core.getInput("keep_history") === "true"
    const keepResults = core.getInput("keep_results") === "true"
    const uploadRequired = keepResults || keepHistory
    const showHistory = core.getInput("show_history") === "true"
    const showRetries = core.getInput("show_retries") === "true"
    const downloadRequired = showRetries || showHistory
     return {
        firebaseProjectId: credentials.projectId,
        storageBucket: core.getInput("storage_bucket") || undefined,
        websiteId: core.getInput("website_id") || undefined,
        websiteExpires: core.getInput("website_expires") || "7d",
        keepHistory: keepHistory,
        keepResults: keepResults,
        ARCHIVE_DIR: '/app/archive',
        HOME_DIR: "/app",
        MOUNTED_PATH: core.getInput("allure_results_path"),
        REPORTS_DIR: "/app/allure-reports",
        RESULTS_STAGING_PATH: "/app/allure-results",
        fileProcessingConcurrency: 10,
        showHistory: showHistory,
        showRetries: showRetries,
        downloadRequired: downloadRequired,
        uploadRequired: uploadRequired
    };
}