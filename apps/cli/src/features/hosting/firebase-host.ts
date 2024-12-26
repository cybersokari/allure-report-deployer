import {HostingProvider} from "../../interfaces/hosting-provider.interface.js";
import * as fs from "fs/promises";
import {changePermissionsRecursively} from "../../utilities/util.js";
import {ArgsInterface} from "../../interfaces/args.interface.js";
// @ts-ignore
import firebase from 'firebase-tools'
import path from "node:path";
import {generate} from "random-words";
import {StringBuilder} from "../../utilities/string-builder.js";

const maxFirebaseAllowedSites = 30;

export class FirebaseHost implements HostingProvider {
    public command: string | undefined
    private readonly reportDir: string
    private hostedSiteUrl: string | undefined
    private readonly configPath: string
    private readonly newSiteId: string


    constructor(readonly args: ArgsInterface) {
        this.reportDir = this.args.REPORTS_DIR
        this.configPath = path.join(this.args.REPORTS_DIR, "firebase.json")
        this.newSiteId = this.getSiteId()
    }

    private getSiteId(): string {
        const builder = new StringBuilder()
            .append(`${generate({maxLength: 6, minLength: 4})}`)
            .append(Date.now().toString())
            .append(`${generate({maxLength: 6, minLength: 4})}`)
            .append(`${generate({maxLength: 6, minLength: 4})}`)
        return builder.values().join('-')
    }

    async deploy(): Promise<undefined | string> {
        await this.createConfigJson();
        // Make Allure report files executable
        await changePermissionsRecursively(this.reportDir, 0o755, 10)
        try {
            await firebase.deploy({
                only: 'hosting',
                config: this.configPath,
                project: this.args.firebaseProjectId,
            });
            return this.hostedSiteUrl;
        } catch (err) {
            console.warn('Failed to deploy report to Firebase hosting', err);
            return undefined;
        }
    }

    async init(): Promise<string> {
        // Add date to URL for ordering and sorting of Firebase sites

        try {
            const data = await this.createFirebaseSite()
            this.hostedSiteUrl = data.defaultUrl as string;
            return this.hostedSiteUrl
        } catch (e) {
            // File creation failed, this is not supposed to happen, but if it does, abort.
            console.error(`Cannot create firebase.json. Aborting deployment...`)
            throw e
        }
    }

    private async createConfigJson(): Promise<void> {
        const config = {
            "hosting": {
                "site": this.newSiteId,
                "public": ".",
                "ignore": [
                    "firebase.json",
                    "**/.*",
                ]
            }
        }
        await fs.mkdir(this.reportDir, {recursive: true,})
        await fs.writeFile(this.configPath, JSON.stringify(config), {mode: 0o755, encoding: 'utf-8'})
    }

    private async createFirebaseSite(): Promise<any> {
        const sites = await this.getExistingFirebaseSiteIds();
        if (sites.length >= maxFirebaseAllowedSites) {
            await this.deleteFirebaseSite(sites[0]);
            console.log(`Firebase site deleted successfully.`);
        }
        // console.warn(`Creating Firebase site with:`, this.newSiteId);
        return firebase.hosting.sites.create(this.newSiteId, {
            project: this.args.firebaseProjectId,
            'non-interactive': undefined
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
        await this.createConfigJson(); // Site deletion requires firebase.json
        return await firebase.hosting.sites.delete(siteId, {
            project: this.args.firebaseProjectId,
            config: this.configPath,
            force: true,
        });
    }

}