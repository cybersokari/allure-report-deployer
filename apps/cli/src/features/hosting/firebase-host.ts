// Imports necessary modules and interfaces for the FirebaseHost class
import {HostingProvider} from "../../interfaces/hosting-provider.interface.js";
import * as fs from "fs/promises";
import {changePermissionsRecursively} from "../../utilities/util.js";
import {ArgsInterface} from "../../interfaces/args.interface.js";
// @ts-ignore
import path from "node:path";
import {generate} from "random-words";
import {StringBuilder} from "../../utilities/string-builder.js";
import {FirebaseService} from "../../services/firebase.service.js";

// Max allowed Firebase sites to prevent exceeding quota
// https://firebase.google.com/docs/hosting/multisites
const maxFirebaseAllowedSites = 35;

// Implements Firebase-specific hosting provider functionality
export class FirebaseHost implements HostingProvider {
    public command: string | undefined;
    private readonly reportDir: string;
    private hostedSiteUrl: string | undefined;
    private configPath?: string;
    private readonly newSiteId: string;
    private readonly service: FirebaseService;

    // Initialize class properties from input arguments
    constructor(readonly args: ArgsInterface, service?: FirebaseService) {
        this.reportDir = this.args.REPORTS_DIR;
        this.newSiteId = this.getSiteId();
        this.service = service ?? new FirebaseService(this.args.firebaseProjectId);
    }

    // Generates a unique site ID using random words and timestamps
    private getSiteId(): string {
        const builder = new StringBuilder()
            .append(`${generate({maxLength: 6, minLength: 4})}`)
            .append(Date.now().toString())
            .append(`${generate({maxLength: 6, minLength: 4})}`)
            .append(`${generate({maxLength: 6, minLength: 4})}`);
        return builder.values().join('-');
    }

    // Deploys the Firebase hosting site
    async deploy(): Promise<undefined | string> {
        if (!this.configPath) {
            throw new Error('FirebaseHost not initialized. Call init() first');
        }
        await this.createConfigJson();
        // Make Allure report files executable
        await changePermissionsRecursively(this.reportDir, 0o755, 10);
        try {
            await this.service.deployHosting(this.configPath)
            return this.hostedSiteUrl;
        } catch (err) {
            console.warn('Failed to deploy report to Firebase hosting', err);
            return undefined;
        }
    }

    // Initializes the Firebase hosting setup and creates a new site
    async init(): Promise<string> {
        try {
            this.configPath = path.join(this.args.REPORTS_DIR, "firebase.json");
            const data = await this.createFirebaseSite();
            this.hostedSiteUrl = data.defaultUrl as string;
            return this.hostedSiteUrl;
        } catch (e) {
            console.error('Cannot create firebase.json. Aborting deployment...', e);
            throw e;
        }
    }

    // Creates the required Firebase hosting configuration file
    private async createConfigJson(): Promise<void> {
        const config = {
            "hosting": {
                "site": this.newSiteId,
                "public": ".",
                "ignore": [
                    "firebase.json",
                    "**/.*"
                ]
            }
        };
        await fs.mkdir(this.reportDir, {recursive: true});
        await fs.writeFile(this.configPath!, JSON.stringify(config), {mode: 0o755, encoding: 'utf-8'});
    }

    // Creates a new Firebase hosting site, deleting the oldest if the limit is reached
    private async createFirebaseSite(): Promise<any> {
        const sites = await this.getExistingFirebaseSiteIds();
        if (sites.length >= maxFirebaseAllowedSites) {
            await this.deleteFirebaseSite(sites[0], this.configPath!);
            console.log(`Oldest report deleted to create new report. Max. ${maxFirebaseAllowedSites}`);
        }
        try {
            return await this.service.createSite(this.newSiteId);
        } catch (e) {
            console.error('Failed to create site:', e);
            throw e;
        }
    }

    // Retrieves existing Firebase site IDs
    private async getExistingFirebaseSiteIds(): Promise<string[]> {
        try {
            const sites = await this.service.listSites();
            return sites
                .map((site: any) => this.extractSubdomain(site.defaultUrl))
                .filter(this.hasValidTimestamp)
                .sort(this.compareTimestamps);
        } catch (err) {
            console.error('Failed to list existing Firebase sites', err);
            throw err;
        }
    }

    // Extracts subdomain from a Firebase hosting URL
    private extractSubdomain(url: string): string {
        const match = /^https:\/\/([^\/]+)\.([^\/]+\.[^\/]+)\/?/.exec(url);
        return match?.[1] ?? '';
    }

    // Validates if the subdomain contains a valid timestamp
    private hasValidTimestamp(value: string): boolean {
        return /-(\d{13})-/.test(value);
    }

    // Compares timestamps for sorting site IDs
    private compareTimestamps(a: string, b: string): number {
        const getTimestamp = (str: string): number => {
            const match = /-(\d{13})-/.exec(str);
            return match ? parseInt(match[1], 10) : 0;
        };
        return getTimestamp(a) - getTimestamp(b);
    }

    // Deletes an existing Firebase hosting site to free up space
    private async deleteFirebaseSite(siteId: string, configPath: string): Promise<void> {
        await this.createConfigJson(); // Site deletion requires firebase.json
        return await this.service.deleteSite({siteId, configPath});
    }
}