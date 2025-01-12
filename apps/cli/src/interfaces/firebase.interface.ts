export interface FirebaseInterface {
    siteId: string;
    rootDir: string;
    deleteSite({siteId, configPath}:{siteId: string, configPath: string}): Promise<void>
    deployHosting(configPath: string): Promise<void>
    createSite(): Promise<any>
    listSites(): Promise<any[]>
    createConfigJson(): Promise<string>
}