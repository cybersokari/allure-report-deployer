import {NotificationData} from "./notification.model";

export interface Notifier {
    notify(data : NotificationData): Promise<void>;
}