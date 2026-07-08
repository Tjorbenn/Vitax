/**
 * This script is served at /sw.js to unregister the previously registered service worker.
 */
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function () {
  self.registration
    .unregister()
    .then(function () {
      return self.clients.matchAll();
    })
    .then(function (clients) {
      clients.forEach((client) => {
        try {
          client.navigate(client.url);
        } catch (error) {
          console.error("Failed to navigate client:", error);
        }
      });
    });
});
