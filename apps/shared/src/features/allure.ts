import * as fs from 'fs/promises'
import {appLog} from "../utilities/util.js";
import * as path from "node:path";
import {CommandRunner} from "../interfaces/command.interface.js";
import {AllureService} from "../services/allure.service.js";
import {ExecutorInterface} from "../interfaces/executor.interface.js";
import PropertiesReader from "properties-reader";

export interface AllureConfig {
    RESULTS_STAGING_PATH: string;
    REPORTS_DIR: string;
    reportLanguage?: string;
}
export class Allure {
    private readonly allureRunner: CommandRunner;
    private readonly config: AllureConfig;

    constructor({allureRunner, config}: {allureRunner?: CommandRunner , config: AllureConfig}) {
        this.allureRunner = allureRunner ?? new AllureService()
        this.config = config;
    }

    get environments(): Map<string, string> | undefined {
        const map = new Map<string, string>();
        // Read the properties file
        try {
            const properties = PropertiesReader(path.join(this.config.RESULTS_STAGING_PATH, 'environment.properties'));
            console.log('Environments')
            properties.each((key, value) => {
                console.log(`${key}: ${value}`);
                map.set(key, value.toString())
            });
            return map
        }catch (e) {
            //Ignore. environment.properties file does not exist
        }
        return undefined
    }

    async open(port = 8090): Promise<void> {
        appLog(`Opening Allure report on port ${port}...`);
        const { exitCode} = await this.allureRunner.runCommand(['open', this.config.REPORTS_DIR, '--port', `${port}`]);
        if (exitCode !== 0) {
            throw new Error("Failed to open Allure report");
        }
    }

    async generate(executor?: ExecutorInterface): Promise<string> {
        if(executor){
            const executorPath = path.join(this.config.RESULTS_STAGING_PATH,'executor.json')
            await fs.writeFile(executorPath, JSON.stringify(executor, null, 2), {mode: 0o755, encoding: 'utf8'});
        }
        const command = [
            'generate',
            this.config.RESULTS_STAGING_PATH,
            '--report-dir',
            this.config.REPORTS_DIR,
            '--clean',
        ]
        if(this.config.reportLanguage){
            command.push('--report-language', this.config.reportLanguage)
        }
        const { exitCode} = await this.allureRunner.runCommand(command);
        if (exitCode !== 0) {
            throw new Error("Failed to generate Allure report");
        }
        return this.config.REPORTS_DIR;
    }
}
