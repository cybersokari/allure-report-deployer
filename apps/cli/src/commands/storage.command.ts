import {Command} from "commander";
import {db} from "../utilities/database.js";
import chalk from "chalk";
import {readFile} from "fs/promises";
import {KEY_BUCKET} from "../utilities/constants.js";
import {Storage as GCPStorage} from '@google-cloud/storage'
import {handleStorageError} from "../main.js";
import {GoogleCredentialsHelper} from "../utilities/google-credentials-helper.js";


export function addStorageBucketCommand(defaultProgram: Command) {
    defaultProgram.command('bucket:set <bucket-name>')
        .description("Set Firebase/GCP storage bucket for future use")
        .action(async (bucketName: string) => {
            const creds = await new GoogleCredentialsHelper().directory()
            if(!creds){
                console.error("You must set your Firebase/GCP credential JSON first: Use the 'gcp-json:set' command")
                process.exit(1)
            }

            try {
                const gcpJson = JSON.parse(await readFile(creds, "utf-8"));
                const bucket = new GCPStorage({credentials: gcpJson}).bucket(bucketName)
                const [exists] = await bucket.exists();
                if (!exists) {
                    console.error(`Storage bucket ${chalk.red(bucketName)} does not exist`);
                    process.exit(1)
                }
                db.set(KEY_BUCKET, bucketName);
                console.log(`Storage bucket set to: ${chalk.cyan(bucketName)}`);
            }catch(err) {
                handleStorageError(err)
                process.exit(1)
            }
        })
    defaultProgram.command('bucket')
        .description('Print your current storage bucket')
        .action(async () => {
        const bucketName = db.get(KEY_BUCKET)
        if(bucketName){
            console.log(`Firebase/GCP bucket: ${chalk.yellow(bucketName)}`)
        } else {
            console.log(`bucket not set. Use the ${chalk.cyan('bucket:set')} argument to set storage bucket`)
        }
    })
}