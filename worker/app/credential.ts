import fs from "fs/promises";

/**
 * Credential Class
 *
 * Handles loading and accessing Google Cloud credentials.
 * Implements a Singleton pattern to ensure only one instance is created.
 */
class Credential {
    private _projectId: string | null = null; // Holds the project ID
    private static instance: Credential; // Singleton instance
    private data: any; // Parsed credentials data

    /**
     * Returns the singleton instance of the Credential class.
     * @returns {Credential} - Instance of Credential
     */
    public static getInstance(): Credential {
        if (!this.instance) {
            this.instance = new Credential();
        }
        return this.instance;
    }

    // Getter for the project ID, throws an error if not initialized
    get projectId(): string {
        if (!this._projectId) {
            throw new Error("Call create");
        }
        return this._projectId;
    }

    /**
     * Loads and parses the Google Application credentials from the environment.
     * Sets the project ID for later use.
     */
    public async init() {
        this.data = JSON.parse(
            await fs.readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS!, 'utf8')
        );
        this._projectId = this.data.project_id;
    }
}

const credential = Credential.getInstance();
export default credential;