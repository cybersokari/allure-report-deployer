import chalk from "chalk";
import {CloudStorage} from "./cloud-storage";

export abstract class Icon {
    public static CHECK_MARK = chalk.green('\u2713')
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
export const STAGING_PATH = `${HOME_DIR}/allure-results`;
export const REPORTS_DIR = `${HOME_DIR}/allure-report`
export const websiteId = process.env.WEBSITE_ID || null;
export const STORAGE_BUCKET = process.env.STORAGE_BUCKET || null;
export const cloudStorage = STORAGE_BUCKET ? CloudStorage.getInstance(STORAGE_BUCKET) : null;
export const keepHistory = process.env.KEEP_HISTORY?.toLowerCase() === 'true' || true // Defaults to true
export const keepResults = process.env.KEEP_RESULTS?.toLowerCase() === 'true' || false
export const watchMode = process.env.WATCH_MODE?.toLowerCase() === 'true' || false;
export const fileProcessingConcurrency = watchMode ? 5 : 10
