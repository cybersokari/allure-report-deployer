import {ReportStatistic} from "../interfaces/counter.interface.js";

export class NotificationData {
    constructor(
        public readonly resultStatus: ReportStatistic,
        public readonly reportUrl?: string,
        public readonly storageUrl?: string
    ) {}
}