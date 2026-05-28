/*
 * Copyright (c) 2026 po2432
 * Repository: https://github.com/Po2432/ScribeTag
 */

/*
 * Copyright (c) 2026 po2432
 * Repository: https://github.com/Po2432/ScribeTag
 */

const CACHE = 'scribegrid-v2';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    '../app.js',
    '../style.css'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(k => Promise.all(k.filter(key => key !== CACHE).map(key => caches.delete(key)))));
});

self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
