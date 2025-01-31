import {ReportStatistic} from "../interfaces/counter.interface.js";

export interface NotificationData {
    resultStatus: ReportStatistic,
    environment?: Map<string, string>,
    reportUrl?: string,
    storageUrl?: string
}