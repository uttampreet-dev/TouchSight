// liblouis in a worker: tables are fetched on demand from /liblouis/tables/ and cached by the service worker.
importScripts('/liblouis/liblouis-build.js', '/liblouis/easy-api.js')
liblouis.registerLogCallback(function () {})
liblouis.enableOnDemandTableLoading('/liblouis/tables/')
self.onmessage = function (ev) {
  var m = ev.data, out = null, err = null
  try { out = liblouis.translateString(m.table, m.text) } catch (e) { err = String((e && e.message) || e) }
  self.postMessage({ id: m.id, out: out, err: err })
}
