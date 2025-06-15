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
            userAgent: z.string().optional(),
            body: z.string().optional(),
            timeout: z.number().optional(),
            selector: z.string().optional(),
            waitForSelector: z.string().optional(),
            cookies: z.array(z.record(z.any())).optional(),
            followRedirects: z.boolean().optional(),
            includeHeaders: z.boolean().optional(),
            includeStatus: z.boolean().optional(),
            disableJavaScript: z.boolean().optional(),
            viewport: z.object({ width: z.number(), height: z.number() }).optional(),
            ignoreSSLErrors: z.boolean().optional(),
        },
        async (_args, _extra) => {
            log.debug(`${toolName} Request`, { _args });
            const {
                url, method, headers, userAgent, body, timeout, selector, waitForSelector,
                cookies, followRedirects, includeHeaders, includeStatus, disableJavaScript,
                proxy, viewport, ignoreSSLErrors
            } = _args;
            const response = await pool.run(async (browser) => {
                let page;
                let context = browser.defaultBrowserContext();
                if (ignoreSSLErrors) {
                    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
                }
                page = await browser.newPage();
                if (viewport) {
                    await page.setViewport(viewport);
                }
                if (userAgent) {
                    await page.setUserAgent(userAgent);
                } else {
                    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
                }
                if (disableJavaScript) {
                    await page.setJavaScriptEnabled(false);
                } else {
                    await page.setJavaScriptEnabled(true);
                }
                if (cookies && cookies.length > 0) {
                    await page.setCookie(...cookies);
                } else {
                    await page.setCookie({
                        name: 'puppeteer_session',
                        value: 'enabled',
                        domain: new URL(url).hostname,
                        path: '/',
                        httpOnly: false,
                        secure: false,
                    });
                }
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
                    let navOptions = { waitUntil: 'domcontentloaded', timeout: timeout || 20000 };
                    let navigationError = null;
                    try {
                        await page.goto(url, navOptions);
                    } catch (err) {
                        navigationError = err;
                        if (err.name === 'TimeoutError') {
                            navOptions.waitUntil = 'networkidle0';
                            navOptions.timeout = timeout || 60000;
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
                    if (waitForSelector) {
                        await page.waitForSelector(waitForSelector, { timeout: timeout || 5000 });
                    } else {
                        await page.waitForSelector('body', { timeout: timeout || 5000 });
                    }
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
                    if (includeStatus && status !== null) result.status = status;
                    if (includeHeaders && respHeaders) result.headers = respHeaders;
                    if (jsonData) {
                        result.content = await mainResponse.text();
                    } else {
                        if (selector) {
                            result.text = await page.$eval(selector, el => el.innerText);
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
                    }
                    if (followRedirects === false && mainResponse) {
                        result.finalUrl = mainResponse.url();
                    }
                    return result;
                } finally {
                    await page.close();
                    if (ignoreSSLErrors) {
                        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
                    }
                }
            });
            log.debug(`${toolName} Response`, { response });
            return buildResponse(response);
        }
    );
}