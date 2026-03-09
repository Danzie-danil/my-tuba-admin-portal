import { precacheAndRoute } from 'workbox-precaching';

// self.__WB_MANIFEST is the injection point for the precache manifest
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
