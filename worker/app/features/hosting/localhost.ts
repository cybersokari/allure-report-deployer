import {HostingProvider} from "../../interfaces/hosting-provider.interface";
import reportBuilder from "../allure";

export class Localhost implements HostingProvider{
    async deploy(): Promise<void> {
        void reportBuilder.open()
    }

    init(): Promise<any> {
        return
    }
}