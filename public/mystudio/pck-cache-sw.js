const PC_PCK_URL = 'https://pub-d22a4db03f974aff80d669d3f1ef553e.r2.dev/%EC%9E%91%EC%97%85.pck';
const ANDROID_PCK_URL = 'https://pub-d22a4db03f974aff80d669d3f1ef553e.r2.dev/%EC%9E%91%EC%97%85_mobile.pck';
const PC_PCK_SIZE = 480699592;
const ANDROID_PCK_SIZE = 235928488;
const CACHE_NAME = 'pck-cache-mystudio-v11';

const PCK_SIZES = new Map([
	[PC_PCK_URL, PC_PCK_SIZE],
	[ANDROID_PCK_URL, ANDROID_PCK_SIZE],
]);

self.addEventListener('install', (event) => {
	event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim().catch((err) => {
		console.warn('Failed to activate the PCK cache service worker:', err);
	}));
});

async function getPckResponse(request, pckSize) {
	let cache = null;

	try {
		cache = await caches.open(CACHE_NAME);
		const cachedResponse = await cache.match(request.url);
		if (cachedResponse) {
			return {
				response: cachedResponse,
				cacheWrite: Promise.resolve(),
			};
		}
	} catch (err) {
		console.warn('Failed to read the PCK cache:', err);
	}

	const response = await fetch(request);
	let cacheWrite = Promise.resolve();
	const contentLength = Number(response.headers.get('content-length'));

	if (
		response.status === 200
		&& contentLength === pckSize
		&& response.type === 'cors'
	) {
		const responseForCache = response.clone();
		cacheWrite = (cache ? Promise.resolve(cache) : caches.open(CACHE_NAME))
			.then((pckCache) => pckCache.put(request.url, responseForCache))
			.catch((err) => {
				console.warn('Failed to store the PCK response:', err);
			});
	}

	return { response, cacheWrite };
}

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const pckSize = PCK_SIZES.get(request.url);
	if (request.method !== 'GET' || pckSize === undefined) {
		return;
	}

	const ua = request.headers.get('user-agent') || '';
	const isIOS = /iPhone|iPad|iPod/i.test(ua);
	const isSafari = /Safari/i.test(ua)
		&& !/CriOS|FxiOS|EdgiOS/i.test(ua);

	if (isIOS && isSafari) {
		return;
	}

	const pckResponse = getPckResponse(request, pckSize);
	event.respondWith(pckResponse.then(({ response }) => response));
	event.waitUntil(
		pckResponse
			.then(({ cacheWrite }) => cacheWrite)
			.catch(() => undefined),
	);
});
