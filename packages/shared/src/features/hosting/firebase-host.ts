import {HostingProvider} from "../../interfaces/hosting-provider.interface.js";
import * as fs from "fs/promises";
import {appLog, changePermissionsRecursively} from "../../utilities/util.js";
import {ArgsInterface} from "../../interfaces/args.interface.js";
// @ts-ignore
import firebase from 'firebase-tools'

export class FirebaseHost implements HostingProvider {
    public command: string | undefined

    constructor(readonly args: ArgsInterface) {
    }

    async deploy(): Promise<undefined|string> {
        // Make Allure report files executable
        await changePermissionsRecursively(this.args.REPORTS_DIR, 0o755, 6)

        let expires = process.env.WEBSITE_EXPIRES
        if (!this.validateWebsiteExpires(expires)) {
            expires = '7d'
        }
        return new Promise<any>(async (resolve, reject) => {

            firebase.hosting.channel.deploy(this.args.reportId, {
                config: `${this.args.REPORTS_DIR}/firebase.json`,
                project: this.args.firebaseProjectId,
                expires: expires,
                'no-authorized-domains': '',
            }).then((data: any) => {
                const url: string | undefined = data[this.args.firebaseProjectId]?.url;
                resolve(url)
            }).catch((err: any) => {
                console.warn('Failed to deploy report to Firebase hosting', err);
                resolve(undefined)
            });
        })
    }


    async init(): Promise<void> {
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
            throw e
        }
    }

    /**
     * Validates the expiration format for the website hosting link.
     * Ensures the format is a number followed by 'h', 'd', or 'w' and is within 30 days.
     * @param expires - The expiration string
     * @returns {boolean} - True if valid, false otherwise
     */
    private validateWebsiteExpires(expires: string | undefined): boolean {

        if(!expires) return false

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