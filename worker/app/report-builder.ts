import {MOUNTED_PATH, REPORTS_DIR, RESULTS_STAGING_PATH} from "./constant";

const allure = require('allure-commandline')
import * as fs from 'fs/promises'
import {appLog, countFiles} from "./util";
import chalk from "chalk";
import {Icon} from "./constant";
import counter from "./counter";

/**
 * ReportBuilder Class
 *
 * Responsible for managing the generation of Allure test reports.
 */
class ReportBuilder {

    public async open(): Promise<null> {
        const open = allure([
            'open',
            REPORTS_DIR,
            '--port', '8090'
        ])

        return await new Promise((resolve, reject) => {
            open.on('exit', async function (exitCode: number) {
                if (exitCode === 0) {
                    // No need to log, Allure logs on success, and I haven't found a way to disable it
                    resolve(null)
                } else {
                    console.warn('Failed to open Allure report')
                    reject(null)
                }
            })
        })
    }

    /**
     * Generates the Allure test report.
     * @returns {Promise<string>} - The directory path of the generated report
     */
    public async generate(): Promise<string | null> {

        appLog(`${chalk.green(Icon.HOUR_GLASS)}  Generating report...`)
        // Generate a new Allure report
        const generation = allure([
            'generate',
            RESULTS_STAGING_PATH,
            '--report-dir',
            REPORTS_DIR,
            '--clean',
        ])

        return await new Promise<string | null>((resolve, reject) => {
            generation.on('exit', async function (exitCode: number) {
                if (exitCode === 0) {
                    // No need to log, Allure logs on success, and I haven't found a way to disable it
                    resolve(REPORTS_DIR)
                } else {
                    console.warn('Failed to generate Allure report')
                    reject(null)
                }
            })
        })
    }

    /**
     * Stages files by moving them from a source directory to the staging directory
     */
    public async stageFilesFromMount() {
        // Count while copying
        await Promise.all([
            fs.cp(`${MOUNTED_PATH}/`, RESULTS_STAGING_PATH, {
                recursive: true, force: true
            }),
            counter.addFilesProcessed(await countFiles([MOUNTED_PATH]))
        ])
    }

}

export default new ReportBuilder()