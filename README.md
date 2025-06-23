# Recced Browser Event Tracker

A lightweight TypeScript library for tracking user actions and events in the browser. It captures clicks and user activity, batches them, and sends them to a configurable endpoint.

## Features

- Tracks user clicks on elements with an `action-name` attribute
- Captures page, element, and event metadata
- Buffers and batches events for efficient network usage
- Handles session management and user/device identification
- Sends data reliably on page unload using `sendBeacon`
- Configurable via simple options
- Written in TypeScript

## Installation

```
npm install
```

## Building

```
npm run build
```

## Testing

```
npm test
```

## Usage

```ts
import ActionTracker from 'recced-browser-event-tracker';

const tracker = ActionTracker.init({
  endpoint: 'https://your-endpoint.com/track',
  debug: true, // Optional: enable debug logging
});
```

Add the `action-name` attribute to any element you want to track:

```html
<button action-name="signup">Sign Up</button>
```

## Configuration Options

See [`TrackerConfig`](src/types/tracker_config.ts):

- `endpoint` (string, required): Where to send tracked events
- `flushInterval` (number, ms): How often to send batches (default: 10000)
- `maxBatchSize` (number): Max events per batch (default: 20)
- `sessionTimeout` (number, ms): Session inactivity timeout (default: 30min)
- `debug` (boolean): Enable debug logs
- `userId` (string): Override user ID

## Development

- Source code: [src/index.ts](src/index.ts)
- Types: [src/types/](src/types/)
