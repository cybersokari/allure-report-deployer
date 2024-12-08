import {REPORTS_DIR, STAGING_PATH, watchMode} from "../index";

const allure = require('allure-commandline')
import * as path from "node:path";
import * as fs from 'fs/promises'
import counter from "./counter";
import pLimit from 'p-limit';
import {publishToFireBaseHosting} from "./util";

/**
 * ReportBuilder Class
 *
 * Responsible for managing the generation of Allure test reports.
 * Handles staging files, generating reports, and triggering hosting services.
 */
class ReportBuilder {
    private timeOut: NodeJS.Timeout | undefined
    private readonly ttl: number

    constructor() {
        this.ttl = Number.parseInt(process.env.TTL_SECS ?? '45')
    }

    /**
     * Sets the time-to-live (TTL) for report generation.
     * Automatically triggers report generation after the specified TTL expires.
     */
    public setTtl() {
        clearTimeout(this.timeOut)
        this.timeOut = setTimeout(async () => {
            const path = await this.generate()
            await publishToFireBaseHosting(path)
        }, this.ttl * 1000)
    }

    /**
     * Generates the Allure test report.
     * Ensures history files are included in the report and handles report generation commands.
     * @returns {Promise<string>} - The directory path of the generated report
     */
    public async generate(): Promise<string> {
        // History files can exist in reports directory in WATCH_MODE
        // due to multiple call to generate, so we try to move
        // the files to /allure-results/history to include the history in the
        // upcoming report due to `allure generate --clean` command
        if (watchMode) {
            const destination = `${STAGING_PATH}/history`
            const source = `${REPORTS_DIR}/history`
            try {
                await fs.rm(destination, {recursive: true, force: true})
                await fs.mkdir(destination, {recursive: true})
                await fs.cp(source, destination, {
                    preserveTimestamps: true,
                    recursive: true,
                    force: true,
                    errorOnExist: false
                })
            } catch (e) {
                console.log(`No history files to move`)
            }
        }
        // Generate a new Allure report
        const generation = allure([
            'generate',
            STAGING_PATH,
            '--report-dir',
            REPORTS_DIR,
            '--clean',
        ])

        return await new Promise<string>((resolve, reject) => {
            generation.on('exit', async function (exitCode: number) {
                if (exitCode === 0) {
                    resolve(REPORTS_DIR)
                } else {
                    console.warn('Failed to generate Allure report')
                    reject('Failed to generate Allure report')
                }
            })
        })
    }

    /**
     * Stages files by moving them from a source directory to the staging directory.
     * Supports concurrency to process multiple files simultaneously.
     * @param files - An array or stream of file paths
     * @param concurrency - The maximum number of concurrent file operations
     */
    public async stageFiles(files: AsyncGenerator<string> | string[], concurrency = 5) {
        const limit = pLimit(concurrency);
        const tasks = [];
        for await (const file of files) {
            tasks.push(
                limit(async () => {
                    try {
                        const destinationFilePath = path.join(STAGING_PATH, path.basename(file));
                        await fs.mkdir(path.dirname(destinationFilePath), {recursive: true});// recursive, don't throw
                        await fs.copyFile(file, destinationFilePath);
                        await counter.incrementFilesProcessed()
                    } catch (e) {
                        console.warn(`Failed to move ${path.basename(file)} to staging area: ${e}`)
                    }
                })
            )
        }
        await Promise.all(tasks)
        return this
    }

}

export default new ReportBuilder()