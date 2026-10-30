// liblouis in a worker: tables are fetched on demand from /liblouis/tables/ and cached by the service worker.
importScripts('/liblouis/liblouis-build.js', '/liblouis/easy-api.js')
liblouis.registerLogCallback(function () {})
liblouis.enableOnDemandTableLoading('/liblouis/tables/')

// The asm.js build aborts in free() on some longer strings. Translate whole; on abort, by sentence; then by word.
function translate(table, text) {
  try { return liblouis.translateString(table, text) } catch (e) {
    var parts = text.split(/(?<=[.!?।])\s+/)
    if (parts.length > 1) return parts.map(function (s) { return translate(table, s) }).join(' ')
    var words = text.split(/\s+/)
    if (words.length > 1) return words.map(function (w) { return translate(table, w) }).join(' ')
    throw e
  }
}
self.onmessage = function (ev) {
  var m = ev.data, out = null, err = null
  try { out = translate(m.table, m.text) } catch (e) { err = String((e && e.message) || e) }
  self.postMessage({ id: m.id, out: out, err: err })
}
