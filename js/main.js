// Bootstrap: scaling, mute toggle, first screen.
'use strict';
(function () {
  const frame = document.getElementById('frame');
  function fit() {
    const s = Math.max(0.3, Math.min(innerWidth / 640, (innerHeight - 26) / 480));
    frame.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
  }
  addEventListener('resize', fit); fit();
  const m = document.getElementById('mute');
  m.onclick = () => setMuted(!muted);
  setMuted(muted);
  window.addEventListener('beforeunload', () => { try { autosave(); } catch (e) { } });
  titleScreen();
})();
