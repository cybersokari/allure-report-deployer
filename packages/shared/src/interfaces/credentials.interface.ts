export interface CredentialsInterface {
    projectId: string;
    init(): Promise<void>;
}