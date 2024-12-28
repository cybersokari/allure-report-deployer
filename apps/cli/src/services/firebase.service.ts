// @ts-ignore
import firebase from 'firebase-tools'

export class FirebaseService {
    constructor(private readonly projectId: string) {}

    /**
     * Deploy a Firebase site using the provided configuration.
     * @param configPath Path to the Firebase configuration file.
     * @returns {Promise<void>}
     */
    async deployHosting(configPath: string): Promise<void> {
        await firebase.deploy({
            only: 'hosting',
            config: configPath,
            project: this.projectId,
        });
    }

    /**
     * Create a new Firebase Hosting site.
     * @param siteId ID of the site to create.
     * @returns {Promise<any>}
     */
    async createSite(siteId: string): Promise<any> {
        return await firebase.hosting.sites.create(siteId, {
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
}