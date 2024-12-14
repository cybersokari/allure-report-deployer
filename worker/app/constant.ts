
export abstract class Icon {
    public static CHECK_MARK = '\u2713'
    public static HOUR_GLASS = '\u23F3'
    public static ROCKET = '🚀'
    public static GLOBE = '🌐'
    public static FILE_UPLOAD = `📤`
    public static CHART = '📊'
    public static FOLDER = '📁'
    public static MAGNIFIER = '🔍'
}

export const DEBUG = process.env.FIREBASE_STORAGE_EMULATOR_HOST !== undefined || false;
export const MOUNTED_PATH = '/allure-results'
export const HOME_DIR = '/app'
export const RESULTS_STAGING_PATH = `${HOME_DIR}/allure-results`;
export const ARCHIVE_DIR = `${HOME_DIR}/archive`;
export const REPORTS_DIR = `${HOME_DIR}/allure-report`
export const websiteId = process.env.WEBSITE_ID || null;
export const STORAGE_BUCKET = process.env.STORAGE_BUCKET || null;
export const keepHistory = process.env.KEEP_HISTORY?.toLowerCase() === 'true' || true // Defaults to true
export const keepResults = process.env.KEEP_RESULTS?.toLowerCase() === 'true' || true
export const fileProcessingConcurrency = 10
export const showHistory = process.env.SHOW_HISTORY?.toLowerCase() === 'true' || true
export const showRetries = process.env.SHOW_RETRIES?.toLowerCase() === 'true' || true
export const uploadRequired = keepResults || keepHistory
export const downloadRequired = showRetries || showHistory
