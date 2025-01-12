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
    // Create a subdirectory specific to your CLI
    const runtimeDir = path.join(os.tmpdir(), 'allure-report-deployer');
    // Delete if already exist
    await fs.rm(runtimeDir, { recursive: true , force: true });
    await fs.mkdir(runtimeDir, {recursive: true});
    return runtimeDir;
}

export async function getUserAppDirectory(): Promise<string> {
    const appDir = path.join(os.homedir(), '.allure-report-deployer');

    if (!fsSync.existsSync(appDir)) {
        await fs.mkdir(appDir, {recursive: true});
    }
    return appDir;
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
