import {Command} from "commander";
import {db} from "../utils/database.js";
import chalk from "chalk";
import {getSavedCredentialDirectory} from "../utils/file-util.js";
import {readFile} from "fs/promises";
import {GCPStorage} from "allure-deployer-shared";
import {KEY_BUCKET} from "../utils/constants.js";

export function addStorageBucketCommand(defaultProgram: Command) {
    defaultProgram.command('bucket:set <bucket-name>')
        .description("Set Firebase/GCP storage bucket for future use")
        .action(async (bucketName: string) => {
            const creds = await getSavedCredentialDirectory()
            if(!creds){
                console.error("You must set your Firebase/GCP credential JSON first: Use gcp-json:set")
                process.exit(1)
            }

            try {
                const gcpJson = JSON.parse(await readFile(creds, "utf-8"));
                new GCPStorage({credentials: gcpJson}).bucket(bucketName)
                db.set(KEY_BUCKET, bucketName);
                console.log(`Storage bucket set to: ${chalk.cyan(bucketName)}`);
            }catch(err) {
                //TODO: Remove this error from log
                console.error('Failed to set bucket: ', err)
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