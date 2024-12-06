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


export async function getAllFiles(dirPath: string): Promise<string[]> {
    const stack = [dirPath];
    const files: string[] = [];

    while (stack.length > 0) {
        const currentDir = stack.pop()!;
        try {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    stack.push(fullPath);
                } else {
                    files.push(fullPath);
                }
            }
        } catch (err) {
            console.warn(`Error processing directory: ${currentDir}`, err);
        }
    }
    return files;
}


export function validateWebsiteExpires(expires: string): boolean {
    // Check if input is empty
    if (!expires) {
        return false;
    }

    if(expires.trim().length > 3){
        return false;
    }


    // Regex to validate format: number followed by h/d/w
    const validFormatRegex = /^(\d+)([hdw])$/;
    const match = expires.match(validFormatRegex);

    if (!match) {
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




