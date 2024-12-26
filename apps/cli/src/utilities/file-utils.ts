import fsSync from "fs";
import fs from "fs/promises";
import path from "node:path";
import archiver from "archiver";
import {appLog} from "./util";

export interface FileUtils {
    chmod(path: string, mode: number | string): Promise<void>;
    readdir(path: string): Promise<string[]>;
}

export class FileManager {

    async changePermissionsRecursively(dirPath: string, mode: fsSync.Mode, maxDepth: number = 1) {
        // Change for the current depth
        await fs.chmod(dirPath, mode);

        if(maxDepth < 1) return

        const files = await fs.readdir(dirPath);

        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const stat = await fs.stat(fullPath);

            if (stat.isDirectory()) {
                await this.changePermissionsRecursively(fullPath, mode, maxDepth - 1);
            } else {
                await fs.chmod(fullPath, mode);
            }
        }
    }


    async zipFolder(sourceFolder: { path: string, destination?: string }[], outputZipFile: string) {
        return await new Promise(async (resolve: (value: boolean) => void, reject) => {

            // Ensure the output directory exists
            const outputDir = path.dirname(outputZipFile);
            await fs.mkdir(outputDir, {recursive: true});
            // Create a file stream for the output zip file
            const output = fsSync.createWriteStream(outputZipFile);
            const archive = archiver('zip', {zlib: {level: 9}}); // Set the compression level

            output.on('close', () => {
                resolve(true);
            });
            archive.on('error', (err) => {
                appLog(`Zip file archive error: ${err}`);
                resolve(false);
            });
            // Pipe archive data to the file stream
            archive.pipe(output);
            // Append files/folders to the archive
            for (const folder of sourceFolder) {
                archive.directory(folder.path, folder.destination || false);
            }
            // Finalize the archive
            archive.finalize();
        });
    }

    async countFiles(directory: string[]) {
        let count = 0;
        try {
            for (const dir of directory) {
                const entries = await fs.readdir(dir, {withFileTypes: true});
                const files = entries.filter((entry) => entry.isFile());
                count += files.length;
            }
        } catch (err) {
            appLog(`Error reading directory: ${err}`);
        }
        return count
    }

    isFileTypeAllure(filePath: string) {
        return !!filePath.match(/^.*\.(json|png|jpeg|jpg|gif|properties|log|webm)$/i)
    }
}