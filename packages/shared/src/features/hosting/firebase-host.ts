import {HostingProvider} from "../../interfaces/hosting-provider.interface.js";
import * as fs from "fs/promises";
import {StringBuilder} from "../../utilities/string-builder.js";
import {appLog, changePermissionsRecursively} from "../../utilities/util.js";
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import {ArgsInterface} from "../../interfaces/args.interface";
const exec = promisify(execCallback);

export class FirebaseHost implements HostingProvider {
    public command: string | undefined

    constructor(readonly websiteId: string, readonly args: ArgsInterface) {}

    async deploy(): Promise<undefined|string> {
        if(!this.command){
            throw new Error('Firebase hosting not initialized. Call init() first.')
        }
        await changePermissionsRecursively(this.args.REPORTS_DIR, 0o755)
        const {stdout, stderr} = await exec(this.command)
        if (stderr && !stdout) {
            appLog(`Deployment failed: ${stderr}`)
            return undefined;
        }
        // Regex to retrieve URL from ANSI-based logs
        const regex = /hosting:channel:\x1b\[[0-9;]*m.*?\(\x1b\[[0-9;]*m?(.*?)\x1b\[[0-9;]*m?\):\s+(https?:\/\/\S+)/;
        const match = regex.exec(stdout)

        if (match && match[2]) {
            const url = match[2]
            return url as string
        } else {
            appLog('Could not retrieve URL from Firebase Hosting.')
            appLog(stdout)
            return undefined
        }
    }


    async init(): Promise<string|null> {
        const config = {
            "hosting": {
                "public": ".",
                "ignore": [
                    "firebase.json",
                    "**/.*",
                ]
            }
        }
        try {
            const configDir = `${this.args.REPORTS_DIR}/firebase.json`
            await fs.mkdir(this.args.REPORTS_DIR, {recursive: true,})
            await fs.writeFile(configDir, JSON.stringify(config), {mode: 0o755, encoding: 'utf-8'})
        } catch (e) {
            // Overwrite fail, this is not supposed to happen
            appLog(`Cannot create firebase.json. Aborting deployment ${e}`)
            return null;
        }
        const builder = new StringBuilder()
        builder.append('firebase hosting:channel:deploy').append(' ')
            .append(`--config ${this.args.REPORTS_DIR}/firebase.json`).append(' ')
            .append(`--project ${this.args.firebaseProjectId}`).append(' ')
            .append('--no-authorized-domains').append(' ')
            .append(this.websiteId)
        // Website expiration setup
        builder.append(' ')
            .append('--expires')
            .append(' ')
        const expires = process.env.WEBSITE_EXPIRES
        if (expires && this.validateWebsiteExpires(expires)) {
            builder.append(expires)
        } else {
            builder.append('7d')
        }
        this.command = builder.toString()
        return this.command
    }

    /**
     * Validates the expiration format for the website hosting link.
     * Ensures the format is a number followed by 'h', 'd', or 'w' and is within 30 days.
     * @param expires - The expiration string
     * @returns {boolean} - True if valid, false otherwise
     */
    private validateWebsiteExpires(expires: string): boolean {

        const length = expires.length
        if (length < 2 || length > 3) {
            return false;
        }

        // Regex to validate a format: number followed by h/d/w
        const validFormatRegex = /^(\d+)([hdw])$/;
        const match = expires.match(validFormatRegex);

        if (!match) {
            return false;
        }

        const value = parseInt(match[1]);
        const unit = match[2];

        // Convert to days for comparison
        let days: number;
        switch (unit) {
            case 'h':
                days = value / 24;
                break;
            case 'd':
                days = value;
                break;
            case 'w':
                days = value * 7;
                break;
            default:
                return false;
        }
        return days <= 30
    }

}