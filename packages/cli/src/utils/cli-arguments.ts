import {ArgsInterface} from "allure-deployer-shared";

export interface CliArguments extends ArgsInterface{
    runtimeCredentialDir: string
    slack_channel?: string
    slack_token?: string
}