// puppeteerPool.mjs
// A FIFO pool of 4 Puppeteer workers for dynamic page scraping
import puppeteer from 'puppeteer';

class PuppeteerPool {
    constructor({ size = 4 } = {}) {
        this.size = size;
        this.queue = [];
        this.workers = [];
        this.idleWorkers = [];
        this.initialized = false;
        this._initPromise = null; // Prevent race condition
    }

    async init() {
        if (this.initialized) return;
        if (this._initPromise) return this._initPromise;
        this._initPromise = (async () => {
            for (let i = 0; i < this.size; i++) {
                const browser = await puppeteer.launch({ headless: 'new' });
                this.workers.push(browser);
                this.idleWorkers.push(browser);
            }
            this.initialized = true;
        })();
        await this._initPromise;
    }

    async run(taskFn) {
        await this.init();
        return new Promise((resolve, reject) => {
            this.queue.push({ taskFn, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.queue.length === 0 || this.idleWorkers.length === 0) return;
        const { taskFn, resolve, reject } = this.queue.shift();
        const browser = this.idleWorkers.shift();
        (async () => {
            let browserHealthy = true;
            try {
                if (!browser.isConnected() || browser.process() && browser.process().exitCode !== null) {
                    // Browser is dead, replace it
                    const idx = this.workers.indexOf(browser);
                    if (idx !== -1) this.workers.splice(idx, 1);
                    const newBrowser = await puppeteer.launch({ headless: 'new' });
                    this.workers.push(newBrowser);
                    this.idleWorkers.push(newBrowser);
                    browserHealthy = false;
                    throw new Error('Browser instance was not healthy and has been replaced.');
                }
                const result = await taskFn(browser);
                resolve(result);
            } catch (err) {
                reject(err);
            } finally {
                if (browserHealthy) this.idleWorkers.push(browser);
                this.processQueue();
            }
        })();
    }

    async close({ force = false, timeout = 10000 } = {}) {
        // Optionally wait for busy workers to finish, or force close after timeout
        const closing = this.workers.map(async (browser) => {
            if (force) {
                try { await browser.close(); } catch { }
            } else {
                // Try to close gracefully
                try { await browser.close(); } catch { }
            }
        });
        await Promise.all(closing);
        this.workers = [];
        this.idleWorkers = [];
        this.initialized = false;
        this._initPromise = null;
    }

    getStatus() {
        return {
            total: this.size,
            busy: this.size - this.idleWorkers.length,
            idle: this.idleWorkers.length,
            queue: this.queue.length,
        };
    }
}

const pool = new PuppeteerPool({ size: 4 });
export default pool;