import {RESULTS_PATH} from "../index";
const allure = require('allure-commandline')
import util = require('node:util')
import {changePermissionsRecursively, createFirebaseJson} from "./util";
import {StringBuilder} from "./string-builder";
import * as fs from "node:fs";
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

    public async buildReport(){
        const destination = `${RESULTS_PATH}/history`
        const source = `${REPORTS_DIR}/history`
        try {
            await exec(`rm -rf ${destination} && mkdir -p ${destination}`)
            fs.cpSync(source, destination, {preserveTimestamps: true, recursive: true})
        } catch (e) {
            console.log(`Allure history cloning failed: ${e}`)
        }
        // Generate new Allure report
        const generation = allure([
            'generate',
            RESULTS_PATH,
            '--report-dir',
            REPORTS_DIR,
            '--clean',
        ])
        generation.on('exit', async function (exitCode: number) {
            if (exitCode !== 0) {
                console.error('Failed to generate Allure report')
            } {
                try {
                    const config = await createFirebaseJson(process.env.FIREBASE_SITE_ID ?? process.env.FIREBASE_PROJECT_ID!)
                    await changePermissionsRecursively(REPORTS_DIR, 0o755)
                    await deploy(config)
                }catch (e) {
                    console.log(`Hosting deployment failed: ${e}`)
                }
            }
        })
    }
}

export async function deploy (config: string)  {
    if(process.env.DEBUG) {
        console.warn('Skipping deployment because to DEBUG set to true')
        return
    }
    console.log(`Deploying to Firebase with config at: ${config}`)
    const builder = new StringBuilder()
    builder.append('firebase deploy').append(' ')
        .append(`--config ${REPORTS_DIR}/firebase.json`).append(' ')
        .append(`--project ${process.env.FIREBASE_SITE_ID ?? process.env.FIREBASE_PROJECT_ID!}`)
    const {stdout} = await exec(builder.toString())
    console.log(stdout)
}
export default new ReportBuilder()