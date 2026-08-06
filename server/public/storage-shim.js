/* storage-shim.js
   claude.ai 아티팩트 밖(예: GitHub Pages)에서도 window.storage.get/set/list/delete 가
   그대로 동작하도록 localStorage 기반 폴리필을 제공합니다.
   이미 window.storage 가 존재하면(=claude.ai 미리보기) 아무것도 하지 않습니다. */
(function () {
  if (window.storage && window.storage.__real !== false) return;

  var PREFIX = 'ecshim::';

  function keyOf(key, shared) {
    return PREFIX + (shared ? 'shared::' : 'priv::') + key;
  }

  window.storage = {
    __real: false,
    async get(key, shared) {
      try {
        var raw = localStorage.getItem(keyOf(key, shared));
        if (raw === null) return null;
        return { key: key, value: raw, shared: !!shared };
      } catch (e) { return null; }
    },
    async set(key, value, shared) {
      try {
        localStorage.setItem(keyOf(key, shared), value);
        return { key: key, value: value, shared: !!shared };
      } catch (e) { return null; }
    },
    async delete(key, shared) {
      try {
        var had = localStorage.getItem(keyOf(key, shared)) !== null;
        localStorage.removeItem(keyOf(key, shared));
        return { key: key, deleted: had, shared: !!shared };
      } catch (e) { return null; }
    },
    async list(prefix, shared) {
      try {
        var out = [];
        var base = PREFIX + (shared ? 'shared::' : 'priv::') + (prefix || '');
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(base) === 0) {
            out.push(k.slice((PREFIX + (shared ? 'shared::' : 'priv::')).length));
          }
        }
        return { keys: out, prefix: prefix, shared: !!shared };
      } catch (e) { return null; }
    }
  };
})();
