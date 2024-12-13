export enum Order{
    byOldestToNewest,
    byNewestToOldest,
}
export interface StorageProvider {
    uploadFile(filePath: string, destination: string): Promise<void>;

    download({prefix, destination, matchGlob, concurrency, order}: {
        prefix?: string | undefined,
        destination: string,
        matchGlob?: string | null,
        order?: Order | undefined,
        concurrency?: number | undefined
    }): Promise<string[]>;

    sortFiles(files: any[], order: Order): any[];
}