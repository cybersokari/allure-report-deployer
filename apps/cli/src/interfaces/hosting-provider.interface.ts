export interface HostingProvider {
    init(): Promise<any>
    deploy(): Promise<any>
}