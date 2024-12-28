export interface FirebaseInterface {
    deleteSite({siteId, configPath}:{siteId: string, configPath: string}): Promise<void>
    deployHosting(configPath: string): Promise<void>
    createSite(siteId: string): Promise<any>
    listSites(): Promise<any[]>
}