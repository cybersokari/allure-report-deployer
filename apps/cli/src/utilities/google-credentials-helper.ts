import fsSync from "fs";
import fs from "fs/promises";
import {db} from "./database.js";
import {KEY_PROJECT_ID} from "./constants.js";
import path from "node:path";
import {getUserAppDirectory, readJsonFile} from "allure-deployer-shared";

export type ServiceAccountJson = {
    "type": string,
    "project_id": string,
    "private_key_id": any,
    "private_key": any,
    "client_email": any,
    "client_id": any,
    "auth_uri": any,
    "token_uri": any,
    "auth_provider_x509_cert_url": any,
    "client_x509_cert_url": any,
    "universe_domain": any
}

export class GoogleCredentialsHelper {
    async save(jsonPath: string):Promise<ServiceAccountJson> {
        const credPath = path.join(await getUserAppDirectory(), 'key.json' );
        await fs.cp(jsonPath, credPath, {force: true})
        const credentialData: ServiceAccountJson = (await readJsonFile(jsonPath)) as ServiceAccountJson;
        db.set(KEY_PROJECT_ID, credentialData.project_id)
        return credentialData;
    }
    async data(): Promise<ServiceAccountJson|null> {
        const dir = await this.directory()
        if(dir){
            return (await readJsonFile(dir)) as ServiceAccountJson
        }
        return null
    }
    async directory(): Promise<string|undefined> {
        const keyDir = path.join(await getUserAppDirectory(), 'key.json' );
        if (fsSync.existsSync(keyDir)) {
            return keyDir;
        }
        return undefined
    }
}