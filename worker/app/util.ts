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



export async function* getAllFilesStream(dir: string): AsyncGenerator<string> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            yield* getAllFilesStream(fullPath);
        } else {
            yield fullPath;
        }
    }
}



export function validateWebsiteExpires(expires: string): boolean {
    // Check if input is empty
    if (!expires) {
        return false;
    }
    const length = expires.trim().length
    if(length < 2 || length > 3){
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




