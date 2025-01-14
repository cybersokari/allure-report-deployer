import {Argument, Command, Option} from "commander";
import {getRuntimeDirectory, readJsonFile} from "../utilities/file-util.js";
import {Bucket, Storage as GCPStorage} from "@google-cloud/storage";
import {GoogleStorageService} from "../services/google-storage.service.js";
import {db} from "../utilities/database.js";
import {KEY_BUCKET} from "../utilities/constants.js";
import {FirebaseHost} from "../features/hosting/firebase.host.js";
import {FirebaseService} from "../services/firebase.service.js";
import path from "node:path";
import {GoogleCredentialsHelper, ServiceAccountJson} from "../utilities/google-credentials-helper.js";

const ERROR_MESSAGES = {
    MISSING_BUCKET: "Storage bucket not provided. History and Retries will not be available in report.",
    MISSING_CREDENTIALS: "Error: Firebase/GCP credentials must be set using 'gcp-json:set' or provided via '--gcp-json'.",
};

async function initBucket(options: any): Promise<Bucket> {
    const bucket = options.bucket || db.get(KEY_BUCKET);
    if (!bucket) {
        throw new Error(ERROR_MESSAGES.MISSING_BUCKET);
    }
    const credentials=  await initCredentials(options.gcpJson);
    return  new GCPStorage({credentials}).bucket(bucket);
}

async function initCredentials(gcpJsonPath: string| undefined): Promise<ServiceAccountJson> {
    if(gcpJsonPath) {
        return await readJsonFile(gcpJsonPath) as ServiceAccountJson;
    } else {
        const cred = await new GoogleCredentialsHelper().data()
        if(!cred) { throw new Error(ERROR_MESSAGES.MISSING_CREDENTIALS); }
        return cred
    }
}

export function addCleanCommand(defaultProgram: Command) {
    defaultProgram.command('clean:storage')
        .addArgument(new Argument('<prefix>', 'Path in bucket to delete archives. Optional').argOptional())
        .description("Delete all .zip archives in bucket")
        .addOption(new Option("--gcp-json <json-path>", "Path to Firebase/GCP JSON credential"))
        .addOption(new Option("-b, --bucket <bucket>", "Storage bucket to delete archives"))
        .action(async (prefix: any, options: any) => {
            const bucket = await initBucket(options);
            try {
                await new GoogleStorageService(bucket, prefix).deleteFiles()
                process.exit(0);
            }catch (e) {
                console.error('Error deleting files:',e);
                process.exit(1);
            }
        })
    defaultProgram.command('clean:reports')
        .description('Delete all hosted reports')
        .addOption(new Option("--gcp-json <json-path>", "Path to Firebase/GCP JSON credential"))
        .action(async (options) => {
            const projectId = (await initCredentials(options.gcpJson)).project_id;
            const runtimeDir = await getRuntimeDirectory();
            const firebaseHost = new FirebaseHost(new FirebaseService(projectId, path.join(runtimeDir, 'allure-report')));
            await firebaseHost.deleteAllSites()
            process.exit(0);
        })
}


