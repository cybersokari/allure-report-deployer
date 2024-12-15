export interface AllureInterface {
    open(port?: number) : Promise<void>;
    generate(): Promise<void>;
}