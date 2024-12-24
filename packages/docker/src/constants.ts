
export const DEBUG = process.env.FIREBASE_STORAGE_EMULATOR_HOST !== undefined || false;
export const MOUNTED_PATH = '/allure-results'
export const HOME_DIR = '/app'
export const RESULTS_STAGING_PATH = `${HOME_DIR}/allure-results`;
export const ARCHIVE_DIR = `${HOME_DIR}/archive`;
export const REPORTS_DIR = `${HOME_DIR}/allure-report`
export const V3 = process.env.V3?.toLowerCase() === 'true' || false;
//TODO: Remove deprecated websiteId
export const reportId = process.env.WEBSITE_ID || process.env.REPORT_ID || 'default';
export const STORAGE_BUCKET = process.env.STORAGE_BUCKET || undefined;
export const keepHistory = process.env.KEEP_HISTORY?.toLowerCase() === 'true' || true // Defaults to true
export const keepResults = process.env.KEEP_RESULTS?.toLowerCase() === 'true' || true
export const fileProcessingConcurrency = 10
export const showHistory = process.env.SHOW_HISTORY?.toLowerCase() === 'true' || true
export const showRetries = process.env.SHOW_RETRIES?.toLowerCase() === 'true' || true
export const uploadRequired = keepResults || keepHistory
export const downloadRequired = showRetries || showHistory
export const slackToken = process.env.SLACK_TOKEN || null;
export const slackChannelId = process.env.SLACK_CHANNEL_ID || null;
export const GITHUB_SUMMARY_PATH = process.env.GITHUB_STEP_SUMMARY || null


