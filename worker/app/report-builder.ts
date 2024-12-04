import {keepHistory, STAGING_PATH, cloudStorage} from "../index";
const allure = require('allure-commandline')
import {deploy} from "./site-builder";
import * as path from "node:path";
import * as fsSync from "fs";

export const REPORTS_DIR = 'allure-report'
class ReportBuilder {
    private timeOut : NodeJS.Timeout | undefined
    private readonly ttl: number

    constructor() {
        this.ttl = Number.parseInt(process.env.TTL_SECS ?? '45')
    }

    public setTtl(){
        clearTimeout(this.timeOut)
        this.timeOut  = setTimeout(this.buildReport, this.ttl * 1000)
    }

    public async buildReport(deployOnSuccess = true) {

        if (cloudStorage && keepHistory) {
            try {
                await cloudStorage.downloadRemoteFilesToStaging({historyOnly: false})
            }catch (e) {
                console.log(`Downloading from Storage failed: ${e}`)
            }
        }

        const destination = `${STAGING_PATH}/history`
        const source = `${REPORTS_DIR}/history`
        try {
            fsSync.rmSync(destination, {recursive: true, force: true})
            fsSync.mkdirSync(destination, {recursive: true})
            fsSync.cpSync(source, destination, {preserveTimestamps: true, recursive: true, errorOnExist: false})
        } catch (e) {
            console.log(`Allure history cloning failed: ${e}`)
        }
        // Generate new Allure report
        const generation = allure([
            'generate',
            STAGING_PATH,
            '--report-dir',
            REPORTS_DIR,
            '--clean',
        ])

        generation.on('exit', async function (exitCode: number) {
            if (exitCode !== 0) {
                console.error('Failed to generate Allure report')
            }
            {
                if (deployOnSuccess) {
                    try {
                        await deploy()
                    } catch (e) {
                        console.log(`Hosting deployment failed: ${e}`)
                    }
                }
            }
        })
    }

    private moveFileToStaging(sourceFilePath: any){
        try {
            const destinationFilePath = path.join(STAGING_PATH, path.basename(sourceFilePath));
            fsSync.mkdirSync(path.dirname(destinationFilePath), {recursive: true});// recursive, don't throw
            fsSync.copyFileSync(sourceFilePath, destinationFilePath);
        }catch (e) {
            console.warn(`Failed to move ${path.basename(sourceFilePath)} to staging area: ${e}`)
        }
    }
    public moveFilesToStaging(files: string[]){
        for (const file of files) {
            this.moveFileToStaging(file);
        }
    }

}
export default new ReportBuilder()