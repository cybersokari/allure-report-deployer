import {HostingProvider} from "../../interfaces/hosting-provider.interface.js";
import * as fs from "fs/promises";
import {changePermissionsRecursively} from "../../utilities/util.js";
import {ArgsInterface} from "../../interfaces/args.interface.js";
// @ts-ignore
import firebase from 'firebase-tools'

const maxFirebaseAllowedSites = 36;

export class FirebaseHost implements HostingProvider {
    public command: string | undefined
    private readonly reportDir: string
    private readonly expires: string | undefined;
    private hostedSiteUrl: string | undefined

    constructor(readonly args: ArgsInterface) {
        this.reportDir = this.args.v3 ? `${this.args.REPORTS_DIR}/plugin-awesome` : this.args.REPORTS_DIR
        this.expires = this.validateWebsiteExpires(this.args.websiteExpires)
    }

    async deploy(): Promise<undefined | string> {
        // Make Allure report files executable
        await changePermissionsRecursively(this.reportDir, 0o755, 6)

        try {
            if (this.expires) {
                const data = await firebase.hosting.channel.deploy(this.args.reportId, {
                    config: `${this.reportDir}/firebase.json`,
                    project: this.args.firebaseProjectId,
                    expires: this.expires,
                    'no-authorized-domains': '',
                });
                this.hostedSiteUrl = data[this.args.firebaseProjectId]?.url;
            } else {
                const data = await firebase.deploy({
                    only: 'hosting',
                    config: `${this.reportDir}/firebase.json`,
                    project: this.args.firebaseProjectId,
                });
                console.log(`Hosting complete`, data);
            }
            return this.hostedSiteUrl;
        } catch (err) {
            console.warn('Failed to deploy report to Firebase hosting', err);
            return undefined;
        }
    }


    async init(): Promise<void> {
        let config
        const newSiteId = `report-${this.args.reportId}-${Date.now()}-${this.generateRandomString(8)}`
        if (this.expires) {
            config = {
                "hosting": {
                    "public": ".",
                    "ignore": [
                        "firebase.json",
                        "**/.*",
                    ]
                }
            }
        } else {
            config = {
                "hosting": {
                    "site": newSiteId,
                    "public": ".",
                    "ignore": [
                        "firebase.json",
                        "**/.*",
                    ]
                }
            }
        }

        try {
            const configDir = `${this.reportDir}/firebase.json`
            await fs.mkdir(this.reportDir, {recursive: true,})
            await fs.writeFile(configDir, JSON.stringify(config), {mode: 0o755, encoding: 'utf-8'})

            if (!this.expires) {
                // If user did not provide expiry, we need to create a Firebase Hosting site
                const data = await this.createFirebaseSite(newSiteId)
                this.hostedSiteUrl = data.defaultUrl as string;
            }
        } catch (e) {
            // File creation failed, this is not supposed to happen, but if it does, abort.
            console.error(`Cannot create firebase.json. Aborting deployment...`)
            throw e
        }
    }

    private async createFirebaseSite(siteId: string): Promise<any> {
        const sites = await this.getExistingFirebaseSiteIds();
        if (sites.length >= maxFirebaseAllowedSites) {
            await this.deleteFirebaseSite(sites[0]);
        }
        return firebase.hosting.sites.create(siteId, {
            project: this.args.firebaseProjectId,
        });
    }

    private async getExistingFirebaseSiteIds(): Promise<string[]> {
        try {
            const data = await firebase.hosting.sites.list({
                project: this.args.firebaseProjectId,
            });

            return data.sites
                .map((site: any) => this.extractSubdomain(site.defaultUrl))
                .filter(this.hasValidTimestamp)
                .sort(this.compareTimestamps);
        } catch (err) {
            console.error('Failed to list existing Firebase sites', err);
            throw err;
        }
    }

    private extractSubdomain(url: string): string {
        const match = /^https:\/\/([^\/]+)\.([^\/]+\.[^\/]+)\/?/.exec(url);
        return match?.[1] ?? '';
    }

    private hasValidTimestamp(value: string): boolean {
        return /-(\d{13})-/.test(value);
    }

    private compareTimestamps(a: string, b: string): number {
        const getTimestamp = (str: string): number => {
            const match = /-(\d{13})-/.exec(str);
            return match ? parseInt(match[1], 10) : 0;
        };

        return getTimestamp(a) - getTimestamp(b);
    }

    private async deleteFirebaseSite(siteId: string): Promise<void> {
        return await firebase.hosting.sites.delete(siteId, {
            project: this.args.firebaseProjectId,
            config: `${this.reportDir}/firebase.json`,
            force: true,
        });
    }

    private generateRandomString(length: number): string {
        return Array.from({length}, () =>
            Math.random().toString(36).charAt(2)
        ).join('');
    }

    /**
     * Validates the expiration format for the website hosting link.
     * Ensures the format is a number followed by 'h', 'd', or 'w' and is within 30 days.
     * @param expires - The expiration string
     * @returns {string|undefined} - The data if valid, undefined if invalid, '30d' if
     * the format valid but duration is more than 30 days
     */
    private validateWebsiteExpires(expires: string | undefined): string | undefined {
        if (!expires) return undefined;

        const match = expires.match(/^(\d+)([hdw])$/);
        if (!match) return undefined;

        const [_, value, unit] = match;
        const days = unit === 'h' ? +value / 24 : unit === 'd' ? +value : +value * 7;

        return days <= 30 ? expires : '30d';
    }

}