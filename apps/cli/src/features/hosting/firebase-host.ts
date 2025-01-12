// Imports necessary modules and interfaces for the FirebaseHost class
import {HostingProvider} from "../../interfaces/hosting-provider.interface.js";
import {changePermissionsRecursively} from "../../utilities/util.js";
// @ts-ignore
import path from "node:path";
import {FirebaseInterface} from "../../interfaces/firebase.interface.js";

// Max allowed Firebase sites to prevent exceeding quota
// https://firebase.google.com/docs/hosting/multisites
const maxFirebaseAllowedSites = 36;

// Implements Firebase-specific hosting provider functionality
export class FirebaseHost implements HostingProvider {
    public command: string | undefined;
    private hostedSiteUrl: string | undefined;
    private readonly service: FirebaseInterface;

    // Initialize class properties from input arguments
    constructor(service: FirebaseInterface) {
        this.service = service
    }

    // Deploys the Firebase hosting site
    async deploy(): Promise<undefined | string> {
        const configPath = await this.service.createConfigJson();
        // Make Allure report files executable
        await changePermissionsRecursively(this.service.rootDir, 0o755, 10);
        try {
            await this.service.deployHosting(configPath)
            return this.hostedSiteUrl;
        } catch (err) {
            console.warn('Failed to deploy report to Firebase hosting', err);
            return undefined;
        }
    }

    // Initializes the Firebase hosting setup and creates a new site
    async init(clean = false): Promise<string> {
        try {
            if(clean){
                try {
                    await this.deleteAllSites()
                    console.log('All sites have been deleted.')
                }catch (e) {}
            }

            const data = await this.createFirebaseSite();
            this.hostedSiteUrl = data.defaultUrl as string;
            return this.hostedSiteUrl;
        } catch (e) {
            console.error('Cannot create firebase.json. Aborting deployment...', e);
            throw e;
        }
    }

    // Creates a new Firebase hosting site, deleting the oldest if the limit is reached
    private async createFirebaseSite(): Promise<any> {
        const sites = await this.getExistingFirebaseSiteIds();
        if (sites.length >= maxFirebaseAllowedSites) {
            const configPath = await this.service.createConfigJson();
            await this.deleteFirebaseSite(sites[0], configPath);
            console.log(`Oldest report deleted to create new report. Max. ${maxFirebaseAllowedSites}`);
        }
        try {
            return await this.service.createSite();
        } catch (e) {
            console.error('Failed to create site:', e);
            throw e;
        }
    }

    async deleteAllSites(): Promise<any> {
        const sites = await this.getExistingFirebaseSiteIds();
        const configPath = await this.service.createConfigJson();
        let numberOfDeletedSites = 0;
        for (const site of sites) {
            try {
                await this.deleteFirebaseSite(site, configPath);
                numberOfDeletedSites++
            }catch (e) {
                console.warn('Failed to delete site:', e);
            }
        }
        console.log(`${numberOfDeletedSites} sites have been deleted.`);
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
        return await this.service.deleteSite({siteId, configPath});
    }
}