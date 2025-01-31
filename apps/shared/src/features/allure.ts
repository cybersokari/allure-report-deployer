import * as fs from 'fs/promises'
import {appLog} from "../utilities/util.js";
import * as path from "node:path";
import {CommandRunner} from "../interfaces/command.interface.js";
import {ArgsInterface} from "../interfaces/args.interface.js";
import {AllureService} from "../services/allure.service.js";
import {ExecutorInterface} from "../interfaces/executor.interface.js";
import PropertiesReader from "properties-reader";

export class Allure {
    private readonly allureRunner: CommandRunner;
    private args: ArgsInterface;

    constructor({allureRunner, args}: {allureRunner?: CommandRunner , args: ArgsInterface}) {
        this.allureRunner = allureRunner ?? new AllureService()
        this.args = args;
    }

    get environments(): Map<string, string> | undefined {
        const map = new Map<string, string>();
        // Read the properties file
        try {
            const properties = PropertiesReader(path.join(this.args.RESULTS_STAGING_PATH, 'environment.properties'));
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
        const { exitCode} = await this.allureRunner.runCommand(['open', this.args.REPORTS_DIR, '--port', `${port}`]);
        if (exitCode !== 0) {
            throw new Error("Failed to open Allure report");
        }
    }

    async generate(data?: ExecutorInterface): Promise<string> {
        if(data){
            const executorPath = path.join(this.args.RESULTS_STAGING_PATH,'executor.json')
            await fs.writeFile(executorPath, JSON.stringify(data, null, 2), {mode: 0o755, encoding: 'utf8'});
        }
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
        if(this.args.reportLanguage){
            command.push('--report-language', this.args.reportLanguage)
        }
        const { exitCode} = await this.allureRunner.runCommand(command);
        if (exitCode !== 0) {
            throw new Error("Failed to generate Allure report");
        }
        return this.args.REPORTS_DIR;
    }
}
