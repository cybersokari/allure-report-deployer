import {STAGING_PATH} from "../index";
const allure = require('allure-commandline')
import * as fs from "node:fs";
import {deploy} from "./site-builder";
import util = require('node:util')
import * as path from "node:path";
import * as fsSync from "fs";
const exec = util.promisify(require('child_process').exec)

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

    private async buildReport(deployToHosting = true){
        const destination = `${STAGING_PATH}/history`
        const source = `${REPORTS_DIR}/history`
        try {
            await exec(`rm -rf ${destination} && mkdir -p ${destination}`)
            fs.cpSync(source, destination, {preserveTimestamps: true, recursive: true, errorOnExist: false})
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
            } {
                if(!deployToHosting) return
                try {
                    await deploy()
                }catch (e) {
                    console.log(`Hosting deployment failed: ${e}`)
                }
            }
        })
    }

    public moveFileToStaging(sourceFilePath: any){
        try {
            const destinationFilePath = path.join(STAGING_PATH, path.basename(sourceFilePath));
            fsSync.mkdirSync(path.dirname(destinationFilePath), { recursive: true });
            fsSync.copyFileSync(sourceFilePath, destinationFilePath);
        }catch (e) {
            console.warn(`Failed to move ${path.basename(sourceFilePath)} to staging area: ${e}`)
        }
    }
}
export default new ReportBuilder()