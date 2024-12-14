import {Bucket, File} from "@google-cloud/storage";
import {DEBUG, fileProcessingConcurrency} from "../utilities/constant.js";
import pLimit from "p-limit";
import {Order, StorageProvider} from "../interfaces/storage-provider.interface.js";
import * as path from "node:path";

export class FirebaseStorageService implements StorageProvider {
    private bucket: Bucket;

    constructor(storageBucket: Bucket) {
        this.bucket = storageBucket;
    }

    public async upload(filePath: string, destination: string) {
        await this.bucket.upload(filePath, {validation: !DEBUG, destination: destination})
    }

    async download({prefix, destination, matchGlob = '**.zip', concurrency = fileProcessingConcurrency, order = Order.byOldestToNewest}: {
        prefix?: string | undefined;
        destination: string;
        matchGlob?: string | undefined;
        concurrency?: number | undefined;
        order?: Order | undefined;
    }): Promise<string[]> {

        let [files] = await this.bucket.getFiles({prefix: prefix, matchGlob});
        files = this.sortFiles(files, order);

        const limit = pLimit(concurrency);
        const downloadPromises = [];
        for (const file of files) {
            downloadPromises.push(limit(async () => {
                // Remove the preceding storageHomeDir path from the downloaded file
                const finalDestination = path.join(destination, path.basename(file.name));
                await file.download({destination: finalDestination, validation: !DEBUG});
                return finalDestination;
            }))
        }
        return await Promise.all(downloadPromises);
    }

    sortFiles(files: File[], order: Order): File[] {
        if (!files || files.length < 2) {
            return files;
        }

        files = files.filter(file => file.metadata.timeCreated);
        return files.sort((a, b) => {
            const aTime = new Date(a.metadata.timeCreated!).getTime();
            const bTime = new Date(b.metadata.timeCreated!).getTime();
            return order === Order.byOldestToNewest ? aTime - bTime : bTime - aTime;
        });
    }

}