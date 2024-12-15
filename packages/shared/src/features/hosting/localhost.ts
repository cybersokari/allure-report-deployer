import {HostingProvider} from "../../interfaces/hosting-provider.interface";
import {AllureInterface} from "../../interfaces/allure.interface";

export class Localhost implements HostingProvider{
    constructor(public readonly allure: AllureInterface) {}
    async deploy(): Promise<void> {
        void this.allure.open()
    }

    async init(): Promise<any> {
        return
    }
}