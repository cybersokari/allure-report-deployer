import {ResultsStatus} from "../interfaces/counter.interface.js";

export class NotificationData {
    constructor(
        public readonly resultStatus: ResultsStatus,
        public readonly reportUrl?: string,
        public readonly storageUrl?: string
    ) {}
}