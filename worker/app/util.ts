import * as fsSync from 'fs'
import * as fs from 'fs/promises'
import * as path from "node:path";

export const getProjectIdFromCredentialsFile = () => {
    try {
        const credentialsContent = JSON.parse(
            fsSync.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS!, 'utf8')
        );
        return credentialsContent.project_id
    } catch (error) {
        console.error('Failed to get project_id from Google credentials:', error);
        throw error;
    }
}

export function logError(...e: any) {
    console.log(e)
}

export async function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): Promise<string[]> {
    try {
        const files = await fs.readdir(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);
            if (stats.isDirectory()) {
                arrayOfFiles = await getAllFiles(filePath, arrayOfFiles);
            } else {
                arrayOfFiles.push(filePath);
            }
        }
    } catch (e) {
        console.warn(e);
    }
    return arrayOfFiles;
}

export function validateWebsiteExpires(expires: string): boolean {
    // Check if input is empty
    if (!expires) {
        console.error('Error: WEBSITE_EXPIRES cannot be empty');
        return false;
    }

    // Regex to validate format: number followed by h/d/w
    const validFormatRegex = /^(\d+)([hdw])$/;
    const match = expires.match(validFormatRegex);

    if (!match) {
        console.error('Error: Invalid WEBSITE_EXPIRES format. Use format like 12h, 7d, or 2w');
        return false;
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    // Convert to days for comparison
    let days: number;
    switch (unit) {
        case 'h':
            days = value / 24;
            break;
        case 'd':
            days = value;
            break;
        case 'w':
            days = value * 7;
            break;
        default:
            return false;
    }
    return days <= 30
}




