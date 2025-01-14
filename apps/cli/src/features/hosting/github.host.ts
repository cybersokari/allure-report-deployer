import {HostingProvider} from "../../interfaces/hosting-provider.interface.js";
import {GithubPagesInterface} from "../../interfaces/github-pages.interface.js";

export class GithubHost implements HostingProvider{
    constructor(readonly client: GithubPagesInterface, readonly filesDir: string) {
    }
    async deploy(): Promise<any> {
        await this.client.deployPages({dir: this.filesDir});
    }

    async init(): Promise<string> {
        await this.client.setupBranch()
        return `https://${this.client.config.OWNER}.github.io/${this.client.config.REPO}/${this.client.config.RUN_NUM}`
    }

}