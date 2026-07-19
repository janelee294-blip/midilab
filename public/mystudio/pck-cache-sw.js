const PCK_URL = 'https://pub-d22a4db03f974aff80d669d3f1ef553e.r2.dev/%EC%9E%91%EC%97%85.pck';
const PCK_SIZE = 249411976;
const CACHE_NAME = 'pck-cache-mystudio-v5';
const CACHE_PREFIX = 'pck-cache-';

self.addEventListener('install', (event) => {
	event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys()
			.then((cacheNames) => Promise.all(
				cacheNames
					.filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
					.map((cacheName) => caches.delete(cacheName)),
			))
			.catch((err) => {
				console.warn('Failed to clean up old PCK caches:', err);
			})
			.then(() => self.clients.claim())
			.catch((err) => {
				console.warn('Failed to activate the PCK cache service worker:', err);
			}),
	);
});

async function getPckResponse(request) {
	let cache = null;

	try {
		cache = await caches.open(CACHE_NAME);
		const cachedResponse = await cache.match(PCK_URL);
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
		&& contentLength === PCK_SIZE
		&& response.type === 'cors'
	) {
		const responseForCache = response.clone();
		cacheWrite = (cache ? Promise.resolve(cache) : caches.open(CACHE_NAME))
			.then((pckCache) => pckCache.put(PCK_URL, responseForCache))
			.catch((err) => {
				console.warn('Failed to store the PCK response:', err);
			});
	}

	return { response, cacheWrite };
}

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET' || request.url !== PCK_URL) {
		return;
	}

	const ua = request.headers.get('user-agent') || '';
	const isIOS = /iPhone|iPad|iPod/i.test(ua);
	const isSafari = /Safari/i.test(ua)
		&& !/CriOS|FxiOS|EdgiOS/i.test(ua);

	if (isIOS && isSafari) {
		return;
	}

	const pckResponse = getPckResponse(request);
	event.respondWith(pckResponse.then(({ response }) => response));
	event.waitUntil(
		pckResponse
			.then(({ cacheWrite }) => cacheWrite)
			.catch(() => undefined),
	);
});
