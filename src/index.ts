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
			console.log("currentUrl",currentUrl)

			const newUrl = new URL(currentUrl);
			newUrl.hostname = newUrl.hostname.replace('build', 'www'); // Replace the hostname
			console.log("newUrl",newUrl);

			// get the html from the newUrl
			const response = await fetch(newUrl);
			// if response type is not html, return the response
			if (!response.headers.get('content-type')?.includes('text/html')) {
				console.log("returning non-html response",response)
				return response;
			}


			const html = await response.text();

			// extract the og:title and og:image from the html
			const regex = /<meta\s+(?:property=(['"])og:title\1\s+content=(['"])(.*?)\2|content=(['"])(.*?)\4\s+property=(['"])og:title\6)\s*\/?>/i;

			const matches = html.match(regex);
			const ogTitle = (matches && matches[0]) ? matches[0] : '';
			console.log(ogTitle);

			let body = `<html>
				<head>
					<meta property="og:url" content="${currentUrl}" />
					${ogTitle}
				</head>
				<body></body>
			</html>`;
			console.log(body)
			return new Response(
				body,
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
