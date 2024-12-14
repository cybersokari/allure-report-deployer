import {fileProcessingConcurrency, MOUNTED_PATH, REPORTS_DIR, RESULTS_STAGING_PATH} from "../utilities/constant.js";

import * as fs from 'fs/promises'
import {Dirent} from 'fs'
import {appLog} from "../utilities/util.js";
import {Icon} from "../utilities/constant.js";
import counter from "../utilities/counter.js";
import pLimit from "p-limit";
import * as path from "node:path";
import {AllureCommandRunner} from "../interfaces/allure-command.interface.js";
import {AllureService} from "../services/allure-service.js";


export class Allure {
    private allureRunner: AllureCommandRunner;

    constructor(allureRunner: AllureCommandRunner) {
        this.allureRunner = allureRunner;
    }

    async open(port = 8090): Promise<void> {
        appLog(`Opening Allure report on port ${port}...`);
        const exitCode = await this.allureRunner.runCommand(['open', REPORTS_DIR, '--port', `${port}`]);
        if (exitCode !== 0) {
            throw new Error("Failed to open Allure report");
        }
    }

    async generate(): Promise<string> {
        appLog(`${Icon.HOUR_GLASS}  Generating Allure report...`)
        const exitCode = await this.allureRunner.runCommand([
            'generate',
            RESULTS_STAGING_PATH,
            '--report-dir',
            REPORTS_DIR,
            '--clean',
        ]);
        if (exitCode !== 0) {
            throw new Error("Failed to generate Allure report");
        }
        return REPORTS_DIR;
    }

    async stageFilesFromMount(): Promise<void> {
        // Ensure staging directory exists and fetch list
        const [files] = await Promise.all([
            fs.readdir(MOUNTED_PATH, { withFileTypes: true }), // Get files info
            fs.mkdir(RESULTS_STAGING_PATH, { recursive: true }) // Create staging if it doesn't exist
        ]);

        const limit = pLimit(fileProcessingConcurrency); // Limit concurrency
        const copyPromises = [];

        let successCount = 0;
        for (const file of files) {
            // Skip directories, process files only
            if (!file.isFile()) continue;

            copyPromises.push(limit(async () => {
                try {
                    await this.copyFile(file);
                    successCount++;
                } catch (error) {
                    console.log(`Error copying file ${file.name}:`, error);
                }
            }));

        }

        // Wait for all file operations to finish
        await Promise.all(copyPromises);
        await counter.addFilesProcessed(successCount);
    }

    private async copyFile(file: Dirent): Promise<void> {
        const fileToCopy = path.join(MOUNTED_PATH, file.name);
        const destination = path.join(RESULTS_STAGING_PATH, file.name);
        await fs.cp(fileToCopy, destination, { force: false, errorOnExist: false });
    }
}

export default new Allure(new AllureService());

