import {NotificationData} from "../models/notification.model.js";
import {ArgsInterface} from "./args.interface";

export interface Notifier {
    args: ArgsInterface
    notify(data : NotificationData): Promise<void>;
}