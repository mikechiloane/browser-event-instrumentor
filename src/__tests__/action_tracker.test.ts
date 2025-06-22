import ActionTracker from '../index';

describe('ActionTracker', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '<button id="btn" action-name="test">Click</button>';
    });

    it('should initialize and track a click', () => {
        (global as any).fetch = jest.fn(() => Promise.resolve({ok: true}));

        const tracker = ActionTracker.init({
            endpoint: 'https://test.com',
            debug: false,
        });

        const btn = document.getElementById('btn')!;
        btn.click();
        expect(tracker).not.toBeNull();
        setTimeout(() => {
            expect((tracker as any).actionBuffer.length).toBeGreaterThanOrEqual(1);
        }, 0);
    });
});