export interface HostingProvider {
    init(clean?: boolean): Promise<string>
    deploy(): Promise<any>
}