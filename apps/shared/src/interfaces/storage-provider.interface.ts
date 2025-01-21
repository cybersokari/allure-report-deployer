export enum Order{
    byOldestToNewest,
    byNewestToOldest,
}
export interface StorageProvider {
    bucket: any
    prefix : string | undefined
    upload(filePath: string, destination: string): Promise<void>;

    getFiles({matchGlob, order, maxResults, endOffset}: {
        matchGlob?: any,
        order?: Order,
        maxResults?: number,
        endOffset?: string
    }): Promise<any[]>;

    download({destination, concurrency, files}: {
        destination: string,
        concurrency?: number,
        files: any[],
    }): Promise<any[]>;

    deleteFiles(matchGlob?: any) : Promise<void>;
    deleteFile(fileName: string) : Promise<void>;

    sortFiles(files: any[], order: Order): any[];
}