import * as fs from 'fs/promises'
import {Dirent} from 'fs'
import {appLog} from "../utilities/util.js";
import {counter} from "../utilities/counter.js";
import pLimit from "p-limit";
import * as path from "node:path";
import {CommandRunner} from "../interfaces/command.interface.js";
import {ArgsInterface} from "../interfaces/args.interface.js";
import {AllureService} from "../services/allure.service.js";
import {ExecutorInterface} from "../interfaces/executor.interface.js";

export class Allure {
    private readonly allureRunner: CommandRunner;
    private args: ArgsInterface;

    constructor({allureRunner, args}: {allureRunner?: CommandRunner , args: ArgsInterface}) {
        this.allureRunner = allureRunner ?? new AllureService()
        this.args = args;
    }

    async open(port = 8090): Promise<void> {
        appLog(`Opening Allure report on port ${port}...`);
        const { exitCode} = await this.allureRunner.runCommand(['open', this.args.REPORTS_DIR, '--port', `${port}`]);
        if (exitCode !== 0) {
            throw new Error("Failed to open Allure report");
        }
    }

    async generate(data: ExecutorInterface): Promise<string> {
        const executorPath = path.normalize(`${this.args.RESULTS_STAGING_PATH}/executor.json`)
        await fs.writeFile(executorPath, JSON.stringify(data, null, 2), {mode: 0o755, encoding: 'utf8'});
        const command = [
            'generate',
            this.args.RESULTS_STAGING_PATH,
            '--report-dir',
            this.args.REPORTS_DIR,
            '--clean',
        ]
        if(this.args.reportName){
            command.push('--report-name', this.args.reportName)
        }
        const { exitCode} = await this.allureRunner.runCommand(command);
        if (exitCode !== 0) {
            throw new Error("Failed to generate Allure report");
        }
        return this.args.REPORTS_DIR;
    }


    async stageFilesFromMount(): Promise<void> {
        // Ensure staging directory exists and fetch list
        const [files] = await Promise.all([
            fs.readdir(this.args.RESULTS_PATH, { withFileTypes: true }), // Get files info
            fs.mkdir(this.args.RESULTS_STAGING_PATH, { recursive: true }) // Create staging if it doesn't exist
        ]);

        const limit = pLimit(this.args.fileProcessingConcurrency); // Limit concurrency
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
        const fileToCopy = path.join(this.args.RESULTS_PATH, file.name);
        const destination = path.join(this.args.RESULTS_STAGING_PATH, file.name);
        await fs.cp(fileToCopy, destination, { force: false, errorOnExist: false });
    }
}
