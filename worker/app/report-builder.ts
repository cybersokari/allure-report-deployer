import {MOUNTED_PATH, REPORTS_DIR, RESULTS_STAGING_PATH} from "./constant";

import * as fs from 'fs/promises'
import {appLog, countFiles} from "./util";
import {Icon} from "./constant";
import counter from "./counter";

export interface AllureCommandRunner {
    runCommand(args: string[]): Promise<number>;
}

export class ReportBuilder {
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
        await Promise.all([
            // Copy all content in mounted directory
            fs.cp(`${MOUNTED_PATH}/`, RESULTS_STAGING_PATH, { recursive: false, force: true }),
            // Count files in directory as processed files
            counter.addFilesProcessed(await countFiles([MOUNTED_PATH]))
        ]);
    }
}

class AllureRunner implements AllureCommandRunner {
    runCommand(args: string[]): Promise<number> {
        const allureProcess = require("allure-commandline")(args);
        return new Promise((resolve, reject) => {
            allureProcess.on("exit", (exitCode: number) => {
                resolve(exitCode);
            });
        });
    }
}

export default new ReportBuilder(new AllureRunner());

