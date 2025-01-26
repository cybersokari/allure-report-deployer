import {SlackConfig} from "./slack.interface.js";
import {HostingProvider} from "./hosting-provider.interface.js";

export interface ArgsInterface {
    storageBucket?: string;
    prefix?: string;
    reportName?: string;
    showHistory?: boolean;
    retries?: number;
    RESULTS_STAGING_PATH: string;
    ARCHIVE_DIR: string;
    REPORTS_DIR: string;
    RESULTS_PATHS: string[];
    fileProcessingConcurrency: number;
    firebaseProjectId? : string;
    uploadRequired: boolean;
    downloadRequired: boolean;
    runtimeCredentialDir: string
    slackConfig?: SlackConfig;
    clean?: boolean;
    host?: HostingProvider;
    reportLanguage?: string;
}

