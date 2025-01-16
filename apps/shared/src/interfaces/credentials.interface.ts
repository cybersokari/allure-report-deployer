export interface CredentialsInterface {
    projectId: string | undefined;
    init(): Promise<void>;
}