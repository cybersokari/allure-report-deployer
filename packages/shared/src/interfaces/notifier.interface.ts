import {NotificationData} from "../models/notification.model.js";

export interface Notifier {
    notify(data : NotificationData): Promise<void>;
}