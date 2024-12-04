import * as fsSync from 'fs'
import * as path from "node:path";

export const getProjectIdFromCredentialsFile = () => {
    try {
        const credentialsContent = JSON.parse(
            fsSync.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS!, 'utf8')
        );
        return  credentialsContent.project_id
    } catch (error) {
        console.error('Failed to get project_id from Google credentials:', error);
        throw error;
    }
}

export function logError(...e: any){
    console.log(e)
}

export function getAllFiles(dirPath : string, arrayOfFiles : string[] = []) {

    try {
        const files = fsSync.readdirSync(dirPath);
        files.forEach((file: any) => {
            const filePath = path.join(dirPath, file);
            if (fsSync.statSync(filePath).isDirectory()) {
                arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
            } else {
                arrayOfFiles.push(filePath);
            }
        });
    }catch (e) {
        console.warn(e);
    }
    return arrayOfFiles;
}




