// @ts-ignore
import Conf from "conf";
import {version} from "../commands/version.command.js";

interface Config {
    slack?: {
        token: string,
        channel: string
    },
    bucket?: string,
    project_id?: string
}
export const db = new Conf<Config>({
    projectVersion: version,
    projectName: 'allure', defaults: {
        slack: undefined
    }
});