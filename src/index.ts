/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import handleProxy from './proxy';
import handleRedirect from './redirect';
import apiRouter from './router';

// Export a default object containing event handlers
export default {
	// The fetch handler is invoked when this worker receives a HTTP(S) request
	// and should return a Response (optionally wrapped in a Promise)
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// You'll find it helpful to parse the request.url string into a URL object. Learn more at https://developer.mozilla.org/en-US/docs/Web/API/URL
		const url = new URL(request.url);

		// get useragent
		const userAgent = request.headers.get('user-agent') || '';

		// if useragent contains facebookexternalhit, return a special response
		if (userAgent.includes('facebookexternalhit')) {
			// get the current request url and change build.domain.com to www.domain.com
			const currentUrl = new URL(request.url);
			const newUrl = currentUrl.hostname.replace('build', 'www');

			// get the html from the newUrl
			const response = await fetch(newUrl);
			const html = await response.text();

			// extract the og:title and og:image from the html
			const ogTitle = html.match(/<meta property="og:title" content="(.*)" \/>/);
			const ogImage = html.match(/<meta property="og:image" content="(.*)" \/>/);
			console.log(ogTitle, ogImage);

			return new Response(
				`<html>
					<head>
						<meta property="og:url" content="${currentUrl}" />
						<meta property="og:title" content="${ogTitle}" />
						<meta property="og:image" content="${ogImage}" />
					</head>
					<body></body>
				</html>`,
				{ headers: { 'Content-Type': 'text/html' } }
			);
		}

		// You can get pretty far with simple logic like if/switch-statements
		switch (url.pathname) {
			case '/redirect':
				return handleRedirect.fetch(request, env, ctx);

			case '/proxy':
				return handleProxy.fetch(request, env, ctx);
		}

		if (url.pathname.startsWith('/api/')) {
			// You can also use more robust routing
			return apiRouter.handle(request);
		}

		return new Response(
			`Try making requests to:
      <ul>
      <li><code><a href="/redirect?redirectUrl=https://example.com/">/redirect?redirectUrl=https://example.com/</a></code>,</li>
      <li><code><a href="/proxy?modify&proxyUrl=https://example.com/">/proxy?modify&proxyUrl=https://example.com/</a></code>, or</li>
      <li><code><a href="/api/todos">/api/todos</a></code></li>`,
			{ headers: { 'Content-Type': 'text/html' } }
		);
	},
};
