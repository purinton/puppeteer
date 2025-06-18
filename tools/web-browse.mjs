import { z, buildResponse } from '@purinton/mcp-server';
const pool = (await import('../src/puppeteerPool.mjs')).default;
export default async function ({ mcpServer, toolName, log }) {
    mcpServer.tool(
        toolName,
        "Extract text or JSON from a web page with advanced options",
        {
            url: z.string(),
            method: z.string().optional().default('GET'),
            headers: z.record(z.string()).optional(),
            body: z.string().optional()
        },
        async (_args, _extra) => {
            log.debug(`${toolName} Request`, { _args });
            const { url, method, headers, body } = _args;
            const response = await pool.run(async (browser) => {
                let page;
                let context = browser.defaultBrowserContext();
                page = await browser.newPage();
                try {
                    const needsInterception = (method && method !== 'GET') || headers || body;
                    if (needsInterception) {
                        await page.setRequestInterception(true);
                        page.on('request', req => {
                            if (req.isNavigationRequest() && req.url() === url) {
                                req.continue({
                                    method: method || 'GET',
                                    headers: headers ? { ...req.headers(), ...headers } : req.headers(),
                                    postData: (method && method !== 'GET' && body) ? body : undefined,
                                });
                            } else {
                                req.continue();
                            }
                        });
                    }
                    let navOptions = { waitUntil: 'domcontentloaded', timeout: 10000 };
                    let navigationError = null;
                    try {
                        await page.goto(url, navOptions);
                    } catch (err) {
                        navigationError = err;
                        if (err.name === 'TimeoutError') {
                            navOptions.waitUntil = 'networkidle0';
                            navOptions.timeout = 10000;
                            try {
                                await page.goto(url, navOptions);
                                navigationError = null;
                            } catch (err2) {
                                navigationError = err2;
                            }
                        }
                    }
                    if (navigationError) {
                        throw new Error(`Navigation failed: ${navigationError.message}`);
                    }
                    await page.waitForSelector('body', { timeout: 5000 });
                    const mainResponse = await page.waitForResponse(resp => resp.url() === url && resp.request().isNavigationRequest(), { timeout: 5000 }).catch(() => null);
                    let contentType = '';
                    let jsonData = null;
                    let status = null;
                    let respHeaders = null;
                    if (mainResponse) {
                        contentType = mainResponse.headers()['content-type'] || '';
                        status = mainResponse.status();
                        respHeaders = mainResponse.headers();
                        if (contentType.includes('application/json')) {
                            try {
                                jsonData = await mainResponse.json();
                            } catch { }
                        }
                    }
                    let result = { url };
                    if (jsonData) {
                        result.content = await mainResponse.text();
                    } else {
                        result.text = await page.evaluate(() => {
                            function getVisibleText(node) {
                                if (node.nodeType === Node.TEXT_NODE) {
                                    return node.textContent.trim();
                                }
                                if (node.nodeType !== Node.ELEMENT_NODE) return '';
                                const style = window.getComputedStyle(node);
                                if (style && (style.display === 'none' || style.visibility === 'hidden')) return '';
                                let txt = '';
                                for (const child of node.childNodes) {
                                    txt += getVisibleText(child) + ' ';
                                }
                                return txt.trim();
                            }
                            return getVisibleText(document.body);
                        });
                    }
                    return result;
                } finally {
                    await page.close();
                }
            });
            log.debug(`${toolName} Response`, { response });
            return buildResponse(response);
        }
    );
}
