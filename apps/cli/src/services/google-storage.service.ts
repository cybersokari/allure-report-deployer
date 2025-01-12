import {Bucket, File} from "@google-cloud/storage";
import pLimit from "p-limit";
import {Order, StorageProvider} from "../interfaces/storage-provider.interface.js";
import path from "node:path";

export class GoogleStorageService implements StorageProvider {
    public bucket: Bucket;
    public readonly prefix: string | undefined;

    constructor(storageBucket: Bucket, prefix: string | undefined) {
        this.bucket = storageBucket;
        this.prefix = prefix;
    }

    public async upload(filePath: string, destination: string) {
        await this.bucket.upload(filePath, {validation: true, destination: destination})
    }

    async getFiles({matchGlob, order = Order.byNewestToOldest, maxResults, endOffset}: {
        matchGlob?: string;
        order?: Order;
        maxResults?: number;
        endOffset?: string
    }): Promise<File[]> {
        let [files] = await this.bucket.getFiles({endOffset, maxResults, matchGlob, prefix: this.prefix});
        return this.sortFiles(files, order);
    }

    async download({destination, concurrency = 10, files}: {
        destination: string;
        concurrency?: number;
        files: File[];
    }): Promise<string[]> {
        const limit = pLimit(concurrency);
        const downloadPromises: PromiseLike<any>[] = [];
        for (const file of files) {
            downloadPromises.push(limit(async () => {
                // Remove the preceding storageHomeDir path from the downloaded file
                const finalDestination = path.join(destination, path.basename(file.name));
                await file.download({destination: finalDestination, validation: true});
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

    async deleteFile(fileName: string) : Promise<void> {
        await this.bucket.file(fileName).delete();
    }

    async deleteFiles(matchGlob = '**.zip') : Promise<void> {
        await this.bucket.deleteFiles({prefix: this.prefix, matchGlob});
    }

}