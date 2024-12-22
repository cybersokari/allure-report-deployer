import path from "node:path";
import fs from "fs/promises";
import fsSync from 'fs'
import * as os from "node:os";
import process from "node:process";

export async function readJsonFile(filePath: string): Promise<any> {
    try {
        // Resolve the absolute path (optional, for robustness)
        const absolutePath = path.resolve(filePath);

        // Read the file contents as a string
        const fileContents = await fs.readFile(absolutePath, 'utf-8');

        // Parse the string as JSON
        return JSON.parse(fileContents);
    } catch (error) {
        console.error(`Error reading JSON file at ${filePath}:`, error);
        throw error;
    }
}

export async function getRuntimeDirectory(): Promise<string> {
    // Get the system temporary directory
    const baseDir = os.tmpdir();
    // Create a subdirectory specific to your CLI
    const appDir = path.join(baseDir, 'allure-report-deployer');
    // Ensure the directory exists
    if (!fsSync.existsSync(appDir)) {
        await fs.mkdir(appDir, {recursive: true});
    }
    process.on('exit', async () => {
        try {
            await fs.rm(appDir, { recursive: true , force: true });
        } catch (err) {
            // @ts-ignore
            console.error(`Error cleaning up temp directory: ${err.message}`);
        }
    });
    return appDir;
}

export async function getUserAppDirectory(): Promise<string> {
    const homeDir = os.homedir();
    const appDir = path.join(homeDir, '.allure-report-deployer');

    if (!fsSync.existsSync(appDir)) {
        await fs.mkdir(appDir, {recursive: true});
    }
    return appDir;
}

export async function getSavedCredentialDirectory(): Promise<string|null> {
    const keyDir = (await getUserAppDirectory()).concat('/key.json');
    if (fsSync.existsSync(keyDir)) {
        return keyDir;
    }
    return null
}

export function isJavaInstalled() {
    const javaHome = process.env.JAVA_HOME;

    let javaPath: string|undefined;

    if (javaHome) {
        javaPath = `${javaHome}/bin/java`;
    } else {
        // Check common system paths
        const commonPaths = ["/usr/bin/java", "/usr/local/bin/java"];
        javaPath = commonPaths.find((path) => fsSync.existsSync(path));
    }

    return javaPath && fsSync.existsSync(javaPath)
}
