"use strict";
/**
 * Lightweight Action Tracker (TypeScript)
 * @version 1.0.0
 * @license MIT
 */
"use client";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class ActionTracker {
    constructor(config) {
        this.actionBuffer = [];
        this.sessionStart = Date.now();
        this.lastActivity = Date.now();
        this.isSending = false;
        this.isClient = typeof window !== 'undefined';
        this.config = Object.assign({ flushInterval: 10000, maxBatchSize: 20, sessionTimeout: 30 * 60 * 1000, debug: false, userId: this.generateId("usr-", 12) }, config);
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
    getOrCreateId(storageKey, prefix) {
        const storedId = localStorage.getItem(storageKey);
        if (storedId)
            return storedId;
        const newId = prefix + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(storageKey, newId);
        return newId;
    }
    generateId(prefix = '', length = 8) {
        return prefix + Math.random().toString(36).substr(2, length);
    }
    setupListeners() {
        document.addEventListener('click', (e) => this.handleClick(e), true);
        const activityEvents = ['mousemove', 'scroll', 'keydown', 'touchstart'];
        activityEvents.forEach(evt => {
            window.addEventListener(evt, () => this.updateActivity());
        });
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
        window.addEventListener('beforeunload', () => this.handleUnload());
    }
    setupTimers() {
        this.flushTimer = window.setInterval(() => this.flush(), this.config.flushInterval);
        this.sessionTimer = window.setInterval(() => {
            if (Date.now() - this.lastActivity > this.config.sessionTimeout) {
                this.newSession();
            }
        }, 10000);
    }
    /* Event Handlers */
    handleClick(event) {
        const target = event.target;
        const actionElement = this.findActionElement(target);
        if (!actionElement)
            return;
        this.track({
            type: 'click',
            actionName: actionElement.getAttribute('action-name') || 'unnamed',
            element: this.getElementInfo(actionElement),
            event: this.getEventInfo(event),
            page: this.getPageInfo()
        });
    }
    handleVisibilityChange() {
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
    handleUnload() {
        if (this.actionBuffer.length > 0) {
            navigator.sendBeacon(this.config.endpoint, this.serializePayload(this.actionBuffer));
        }
    }
    /* Tracking Methods */
    track(payload) {
        const enrichedPayload = Object.assign(Object.assign({}, payload), { timestamp: new Date().toISOString(), userId: this.userId, sessionId: this.sessionId, deviceId: this.deviceId });
        this.actionBuffer.push(enrichedPayload);
        this.lastActivity = Date.now();
        if (this.actionBuffer.length >= this.config.maxBatchSize) {
            this.flush();
        }
        if (this.config.debug) {
            console.log('Tracked action', enrichedPayload);
        }
    }
    flush() {
        return __awaiter(this, arguments, void 0, function* (force = false) {
            if (this.isSending || (!force && this.actionBuffer.length === 0))
                return;
            const batch = [...this.actionBuffer];
            if (batch.length === 0)
                return;
            this.actionBuffer = [];
            this.isSending = true;
            try {
                if (this.config.endpoint) {
                    yield fetch(this.config.endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: this.serializePayload(batch)
                    });
                }
                if (this.config.debug) {
                    console.log('Successfully sent batch', batch);
                }
            }
            catch (error) {
                this.actionBuffer.unshift(...batch);
                console.error('ActionTracker failed to send:', error);
            }
            finally {
                this.isSending = false;
            }
        });
    }
    /* Helper Methods */
    findActionElement(element) {
        while (element && element !== document.documentElement) {
            if (element.hasAttribute('action-name')) {
                return element;
            }
            element = element.parentElement;
        }
        return null;
    }
    getElementInfo(element) {
        return {
            tag: element.tagName.toLowerCase(),
            id: element.id || null,
            classes: element.className || null,
            text: (element.textContent || '').trim().substring(0, 100),
            attributes: this.getCustomAttributes(element)
        };
    }
    getCustomAttributes(element) {
        const attrs = {};
        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('data-')) {
                attrs[attr.name] = attr.value;
            }
        });
        return attrs;
    }
    getEventInfo(event) {
        return {
            x: event.clientX,
            y: event.clientY,
            target: event.target.tagName.toLowerCase()
        };
    }
    getPageInfo() {
        return {
            url: window.location.href,
            path: window.location.pathname,
            referrer: document.referrer,
            title: document.title,
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
    serializePayload(data) {
        return JSON.stringify({
            meta: {
                sentAt: new Date().toISOString(),
                userAgent: navigator.userAgent,
                language: navigator.language
            },
            batch: data
        });
    }
    newSession() {
        this.sessionId = this.generateId('ses-', 12);
        this.sessionStart = Date.now();
        if (this.config.debug) {
            console.log('New session started', this.sessionId);
        }
    }
    updateActivity() {
        this.lastActivity = Date.now();
    }
    /* Public API */
    static init(config) {
        if (typeof window === 'undefined') {
            return null;
        }
        if (!(window === null || window === void 0 ? void 0 : window._actionTracker)) {
            window._actionTracker = new ActionTracker(config);
        }
        return window._actionTracker;
    }
}
// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActionTracker;
}
else if (typeof define === 'function' && define.amd) {
    define([], () => ActionTracker);
}
else {
    window.ActionTracker = ActionTracker;
}
exports.default = ActionTracker;
