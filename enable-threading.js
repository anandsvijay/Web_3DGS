(function() {
    'use strict';
    
    // Check if we're in the service worker context
    if (typeof importScripts === 'function') {
        // SERVICE WORKER CONTEXT
        self.addEventListener('install', (event) => {
            console.log('[COI SW] Installing...');
            self.skipWaiting();
        });

        self.addEventListener('activate', (event) => {
            console.log('[COI SW] Activating...');
            event.waitUntil(self.clients.claim());
        });

        self.addEventListener('fetch', (event) => {
            if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
                return;
            }
            
            event.respondWith((async () => {
                try {
                    const response = await fetch(event.request);
                    
                    // Don't modify responses with null body
                    if (response.status === 0 || response.status === 204 || 
                        response.status === 205 || response.status === 304) {
                        return response;
                    }
                    
                    const newHeaders = new Headers(response.headers);
                    newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
                    newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
                    
                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders
                    });
                    
                } catch (error) {
                    console.error('[COI SW] Fetch error:', error);
                    return fetch(event.request);
                }
            })());
        });
        
        return; // Exit - we're in service worker context
    }
    
    // MAIN PAGE CONTEXT - Register the service worker
    (async function() {
        if (!('serviceWorker' in navigator)) {
            console.error('[COI] Service workers not supported');
            return;
        }

        // Check if already isolated
        if (typeof SharedArrayBuffer !== 'undefined' && crossOriginIsolated) {
            console.log('[COI] ✅ Already cross-origin isolated, threading enabled');
            return;
        }

        console.log('[COI] Setting up threading support...');

        try {
            // Register this same file as the service worker
            const reg = await navigator.serviceWorker.register('./enable-threading.js', { 
                scope: './' 
            });

            console.log('[COI] Service worker registered');

            // If no controller, reload after activation
            if (!navigator.serviceWorker.controller) {
                console.log('[COI] Waiting for service worker activation...');
                
                await new Promise((resolve) => {
                    if (reg.active) {
                        resolve();
                    } else {
                        const worker = reg.installing || reg.waiting;
                        if (worker) {
                            worker.addEventListener('statechange', function() {
                                if (this.state === 'activated') {
                                    resolve();
                                }
                            });
                        } else {
                            resolve();
                        }
                    }
                });

                console.log('[COI] Reloading to activate threading...');
                window.location.reload();
                return;
            }

            // Check if we need to reload
            if (typeof SharedArrayBuffer === 'undefined') {
                console.log('[COI] Reloading to enable SharedArrayBuffer...');
                window.location.reload();
            } else {
                console.log('[COI] ✅ Threading enabled successfully');
            }

        } catch (err) {
            console.error('[COI] Failed to enable threading:', err);
        }
    })();
})();