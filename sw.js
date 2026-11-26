/* Service worker de « Mission du jour » : reçoit les notifications et les affiche. Aucune mise en cache. */
var PUSH_URL = "";
try { PUSH_URL = new URL(self.location.href).searchParams.get("push") || ""; } catch (e) { PUSH_URL = ""; }

self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (ev) { ev.waitUntil(self.clients.claim()); });

function hex(buf) {
  var a = new Uint8Array(buf), s = "", i;
  for (i = 0; i < a.length; i++) { s += (a[i] < 16 ? "0" : "") + a[i].toString(16); }
  return s;
}

function showFromServer() {
  var fallback = { title: "Mission du jour", body: "Ouvre l'appli." };
  return self.registration.pushManager.getSubscription().then(function (sub) {
    if (!sub || !PUSH_URL) { return fallback; }
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(sub.endpoint)).then(function (d) {
      return fetch(PUSH_URL + "/msg?h=" + hex(d), { cache: "no-store" });
    }).then(function (r) { return r.ok ? r.json() : fallback; });
  }).catch(function () { return fallback; }).then(function (m) {
    return self.registration.showNotification(m && m.title ? m.title : fallback.title, {
      body: m && m.body ? m.body : fallback.body,
      icon: "icon-192.png",
      badge: "icon-192.png",
      tag: m && m.tag ? m.tag : "mission"
    });
  });
}

self.addEventListener("push", function (ev) { ev.waitUntil(showFromServer()); });

self.addEventListener("notificationclick", function (ev) {
  ev.notification.close();
  ev.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    var i;
    for (i = 0; i < list.length; i++) { if ("focus" in list[i]) { return list[i].focus(); } }
    return self.clients.openWindow("./");
  }));
});
