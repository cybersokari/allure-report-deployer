import {GithubConfig} from "./github.interface.js";

export interface GithubPagesInterface {
    branch: string;
    config: GithubConfig
    deployPages({dir}: { dir: string}): Promise<void>;
    setupBranch(): Promise<void>;
}