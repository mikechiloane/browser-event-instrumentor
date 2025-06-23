/**
 * Lightweight Action Tracker (TypeScript)
 * @version 1.0.0
 * @license MIT
 */
"use client";
import { ActionPayload } from "./types/action_payload";
import { TrackerConfig } from "./types/tracker_config";
import { PageInfo } from "./types/page_info";
import { EventInfo } from "./types/event_info";
import { ElementInfo } from "./types/element_info";

class ActionTracker {
    private config: Required<TrackerConfig>;
    private actionBuffer: ActionPayload[] = [];
    private sessionStart: number = Date.now();
    private lastActivity: number = Date.now();
    private isSending: boolean = false;
    private flushTimer?: number;
    private sessionTimer?: number;
    private isClient: boolean = typeof window !== 'undefined';

    public userId: string;
    public sessionId: string;
    public deviceId: string;

    constructor(config: TrackerConfig) {
        this.config = {
            flushInterval: 10000,
            maxBatchSize: 20,
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            debug: false,
            userId: this.generateId("usr-", 12),
            ...config
        };

        // Initialize IDs
        this.userId = this.getOrCreateId('at_user_id', 'usr-');
        this.sessionId = this.generateId('ses-', 12);
        this.deviceId = this.generateId('dev-', 8);

        // Setup tracking
        this.setupListeners();
        this.setupTimers();

        if (this.config.debug) {
            console.log('ActionTracker initialized', this);
        }
    }

    /* Core Methods */
    private getOrCreateId(storageKey: string, prefix: string): string {
        try {
            const storedId = localStorage.getItem(storageKey);
            if (storedId) return storedId;
            const newId = prefix + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(storageKey, newId);
            return newId;
        } catch {
            return prefix + Math.random().toString(36).substr(2, 9);
        }
    }

    private generateId(prefix: string = '', length: number = 8): string {
        return prefix + Math.random().toString(36).substr(2, length);
    }

    private setupListeners(): void {
        document.addEventListener('click', (e: MouseEvent) => this.handleClick(e), true);

        const activityEvents: (keyof WindowEventMap)[] =
            ['mousemove', 'scroll', 'keydown', 'touchstart'];

        activityEvents.forEach(evt => {
            window.addEventListener(evt, () => this.updateActivity());
        });

        document.addEventListener('visibilitychange', () =>
            this.handleVisibilityChange());

        window.addEventListener('beforeunload', () => this.handleUnload());
    }

    private setupTimers(): void {
        this.flushTimer = window.setInterval(
            () => this.flush(),
            this.config.flushInterval
        );

        this.sessionTimer = window.setInterval(() => {
            if (Date.now() - this.lastActivity > this.config.sessionTimeout) {
                this.newSession();
            }
        }, 10000);
    }

    /* Event Handlers */
    private handleClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const actionElement = this.findActionElement(target);
        if (!actionElement) return;

        this.track({
            type: 'click',
            actionName: actionElement.getAttribute('action-name') || 'unnamed',
            element: this.getElementInfo(actionElement),
            event: this.getEventInfo(event),
            page: this.getPageInfo()
        });
    }

    private handleVisibilityChange(): void {
        if (document.visibilityState === 'hidden') {
            this.flush(true);
        }
    }

    /**
     * Handles the `beforeunload` event, triggered when the user is about to leave the page.
     *
     * - Checks if there are any unsent actions in the `actionBuffer`.
     * - If the buffer is not empty, sends the serialized payload to the configured endpoint
     *   using the `navigator.sendBeacon` API.
     *
     * The `sendBeacon` API ensures that the data is sent to the server asynchronously,
     * even as the page is unloading, providing a reliable way to capture the final actions.
     */
    private handleUnload(): void {
        if (this.actionBuffer.length > 0) {
            navigator.sendBeacon(
                this.config.endpoint,
                this.serializePayload(this.actionBuffer)
            );
        }
    }

    /* Tracking Methods */
    public track(payload: Omit<ActionPayload,
        'timestamp' | 'userId' | 'sessionId' | 'deviceId'>): void {

        const enrichedPayload: ActionPayload = {
            ...payload,
            timestamp: new Date().toISOString(),
            userId: this.userId,
            sessionId: this.sessionId,
            deviceId: this.deviceId
        };

        this.actionBuffer.push(enrichedPayload);
        this.lastActivity = Date.now();

        if (this.actionBuffer.length >= this.config.maxBatchSize) {
            this.flush();
        }

        if (this.config.debug) {
            console.log('Tracked action', enrichedPayload);
        }
    }

    public async flush(force: boolean = false): Promise<void> {
        if (this.isSending || (!force && this.actionBuffer.length === 0)) return;
        const events = [...this.actionBuffer];
        if (events.length === 0) return;
        this.actionBuffer = [];
        this.isSending = true;

        try {
            if (this.config.endpoint) {
                await fetch(this.config.endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: this.serializePayload(events)
                });
            }

            if (this.config.debug) {
                console.log('Successfully sent batch', events);
            }
        } catch (error) {
            this.actionBuffer.unshift(...events);
            console.error('ActionTracker failed to send:', error);
        } finally {
            this.isSending = false;
        }
    }

    /* Helper Methods */
    private findActionElement(element: HTMLElement | null): HTMLElement | null {
        while (element && element !== document.documentElement) {
            if (element.hasAttribute('action-name')) {
                return element;
            }
            element = element.parentElement;
        }
        return null;
    }

    private getElementInfo(element: HTMLElement): ElementInfo {
        return {
            tag: element.tagName.toLowerCase(),
            id: element.id || null,
            classes: element.className || null,
            text: (element.textContent || '').trim().substring(0, 100),
            attributes: this.getCustomAttributes(element)
        };
    }

    private getCustomAttributes(element: HTMLElement): Record<string, string> {
        const attrs: Record<string, string> = {};
        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('data-')) {
                attrs[attr.name] = attr.value;
            }
        });
        return attrs;
    }

    private getEventInfo(event: MouseEvent): EventInfo {
        return {
            x: event.clientX,
            y: event.clientY,
            target: (event.target as HTMLElement).tagName.toLowerCase()
        };
    }

    private getPageInfo(): PageInfo {
        return {
            url: window.location.href,
            path: window.location.pathname,
            referrer: document.referrer,
            title: document.title,
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    private serializePayload(data: ActionPayload[]): string {
        return JSON.stringify({
            meta: {
                sentAt: new Date().toISOString(),
                userAgent: navigator.userAgent,
                language: navigator.language
            },
            batch: data
        });
    }

    private newSession(): void {
        this.sessionId = this.generateId('ses-', 12);
        this.sessionStart = Date.now();
        if (this.config.debug) {
            console.log('New session started', this.sessionId);
        }
    }

    private updateActivity(): void {
        this.lastActivity = Date.now();
    }

    /* Public API */
    public static init(config: TrackerConfig): ActionTracker | null {
        if (typeof window === 'undefined') {
            return null;
        }
        if (!window?._actionTracker) {
            window._actionTracker = new ActionTracker(config);
        }
        return window._actionTracker;
    }
}


// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActionTracker;
} else if (typeof define === 'function' && define.amd) {
    define([], () => ActionTracker);
} else {
    (window as any).ActionTracker = ActionTracker;
}

export default ActionTracker;