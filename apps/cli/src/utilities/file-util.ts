import path from "node:path";
import fs from "fs/promises";
import fsSync from 'fs'
import * as os from "node:os";
import process from "node:process";
import pLimit from "p-limit";

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
    await fs.rm(runtimeDir, {recursive: true, force: true});
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
    if (javaHome) {
        return fsSync.existsSync(path.join(javaHome, 'bin/java'))
    } else {
        // Check common system paths
        const commonPaths = ["/usr/bin/java", "/usr/local/bin/java"];
        const javaPath = commonPaths.find((path) => fsSync.existsSync(path));
        return javaPath !== undefined && fsSync.existsSync(javaPath)
    }
}

export async function copyFiles({from, to, concurrency = 10, overwrite = false}: {
    from: string,
    to: string,
    concurrency?: number,
    overwrite?: boolean,
}): Promise<number> {
    // Ensure staging directory exists and fetch list
    const [files] = await Promise.all([
        fs.readdir(from, {withFileTypes: true}), // Get files info
        fs.mkdir(to, {recursive: true}) // Create staging if it doesn't exist
    ]);

    const limit = pLimit(concurrency); // Limit concurrency
    const copyPromises = [];

    let successCount = 0;
    for (const file of files) {
        // Skip directories, process files only
        if (!file.isFile()) continue;

        copyPromises.push(limit(async () => {
            try {
                const fileToCopy = path.join(from, file.name);
                const destination = path.join(to, file.name);
                await fs.cp(fileToCopy, destination, {force: overwrite, errorOnExist: false});
                successCount++;
            } catch (error) {
                console.log(`Error copying file ${file.name}:`, error);
            }
        }));

    }
    await Promise.all(copyPromises);
    return successCount
}
