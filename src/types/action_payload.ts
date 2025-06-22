import {PageInfo} from "./page_info";
import {EventInfo} from "./event_info";
import {ElementInfo} from "./element_info";

type ActionPayload = {
    type: string;
    actionName: string;
    timestamp: string;
    userId: string;
    sessionId: string;
    deviceId: string;
    element: ElementInfo;
    event?: EventInfo;
    page: PageInfo;
}

export type { ActionPayload };