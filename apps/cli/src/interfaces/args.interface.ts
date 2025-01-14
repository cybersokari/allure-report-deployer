import {SlackConfig} from "./slack.interface.js";
import {GithubConfig} from "./github.interface.js";
import {HostingProvider} from "./hosting-provider.interface";

export interface ArgsInterface {
    storageBucket?: string;
    prefix?: string;
    reportName?: string;
    showHistory?: boolean;
    retries?: number;
    HOME_DIR: string;
    RESULTS_STAGING_PATH: string;
    ARCHIVE_DIR: string;
    REPORTS_DIR: string;
    RESULTS_PATH: string;
    fileProcessingConcurrency: number;
    firebaseProjectId: string;
    uploadRequired: boolean;
    downloadRequired: boolean;
    runtimeCredentialDir: string
    slackConfig?: SlackConfig;
    githubConfig?: GithubConfig
    clean?: boolean;
    host?: HostingProvider;
}

