import {HostingProvider} from "./hosting-provider";
import reportBuilder from "../allure-service";

export class Localhost implements HostingProvider{
    async deploy(): Promise<void> {
        void reportBuilder.open()
    }

    init(): Promise<any> {
        return
    }
}