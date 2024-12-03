import * as fsSync from 'fs'

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




