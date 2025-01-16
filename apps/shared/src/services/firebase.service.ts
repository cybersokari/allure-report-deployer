// @ts-ignore
import firebase from 'firebase-tools'
import {FirebaseInterface} from "../interfaces/firebase.interface.js";
import {StringBuilder} from "../utilities/string-builder.js";
import {generate} from "random-words";
import * as console from "node:console";
import path from "node:path";
import fs from "fs/promises";

export class FirebaseService implements FirebaseInterface{
    readonly siteId: string;
    constructor(private readonly projectId: string, public readonly rootDir: string) {
        this.siteId = this.createSiteId();
    }

    /**
     * Deploy a Firebase site using the provided configuration.
     * @returns {Promise<void>}
     */
    async deployHosting(): Promise<void> {
        const configPath = await this.createConfigJson();
        await firebase.deploy({
            only: 'hosting',
            config: configPath,
            project: this.projectId,
        });
    }

    /**
     * Create a new Firebase Hosting site.
     * @returns {Promise<any>}
     */
    async createSite(): Promise<any> {
        return await firebase.hosting.sites.create(this.siteId, {
            project: this.projectId,
            'non-interactive': undefined,
        });
    }

    /**
     * List all existing Firebase Hosting sites.
     * @returns {Promise<any[]>}
     */
    async listSites(): Promise<any[]> {
        try {
            const result = await firebase.hosting.sites.list({
                project: this.projectId,
            });
            return result.sites || [];
        } catch (error) {
            console.error('Failed to list sites:', error);
            throw error;
        }
    }

    /**
     * Delete an existing Firebase Hosting site.
     * @param siteId ID of the site to delete.
     * @param configPath Path to firebase.json
     * @returns {Promise<void>}
     */
    async deleteSite({siteId, configPath}:{siteId: string, configPath: string}): Promise<void> {
        try {
            await firebase.hosting.sites.delete(siteId, {
                project: this.projectId,
                config: configPath,
                force: true,
            });
        } catch (error) {
            console.error(`Failed to delete site ${siteId}:`, error);
            throw error;
        }
    }

    private createSiteId(): string {
        const builder = new StringBuilder()
            .append(`${generate({maxLength: 6, minLength: 4})}`)
            .append(`${generate({maxLength: 6, minLength: 3})}`)
            .append(Date.now().toString())
            .append(`${generate({maxLength: 6, minLength: 4})}`)
            .append(`${generate({maxLength: 6, minLength: 4})}`);
        return builder.values().join('-');
    }

    async createConfigJson(): Promise<string> {
        const config: Object = {
            "hosting": {
                "site": this.siteId,
                "public": ".",
                "ignore": [
                    "firebase.json",
                    "**/.*"
                ]
            }
        };
        await fs.mkdir(this.rootDir, {recursive: true});
        const configPath = path.join(this.rootDir, 'firebase.json')
        await fs.writeFile(configPath, JSON.stringify(config), {mode: 0o755, encoding: 'utf-8'});
        return configPath;
    }
}