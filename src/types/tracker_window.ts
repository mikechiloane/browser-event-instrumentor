import ActionTracker from "../index";

export {};

declare global {
    interface Window {
        _actionTracker?: ActionTracker;
    }
}