// Bootstrap: scaling, mute toggle, first screen.
'use strict';
(function () {
  const frame = document.getElementById('frame');
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  document.body.classList.toggle('touch', coarse || Math.min(innerWidth, innerHeight) < 600);
  // Fit the fixed 640x480 stage to the screen. A phone held upright is turned sideways
  // so the stage fills the tall screen (about 35% larger than shrinking it to the width).
  function fit() {
    const vv = window.visualViewport, w = vv ? vv.width : innerWidth, h = vv ? vv.height : innerHeight;
    const small = Math.min(w, h) < 700;
    document.body.classList.toggle('small', small);
    const reserve = small ? 0 : 26;                        // desktop keeps room for the footer bar
    const rotate = small && h > w * 1.05;
    let s;
    if (rotate) s = Math.min((h - 4) / 640, (w - 4) / 480);
    else s = Math.min((w - (small ? 4 : 0)) / 640, (h - reserve - (small ? 4 : 0)) / 480);
    s = Math.max(0.3, s);
    frame.style.transform = 'translate(-50%,-50%)' + (rotate ? ' rotate(90deg)' : '') + ' scale(' + s + ')';
    frame.style.top = small ? '50%' : 'calc(50% - 12px)';
    document.body.classList.toggle('rotated', rotate);
  }
  addEventListener('resize', fit);
  addEventListener('orientationchange', () => setTimeout(fit, 150));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);
  fit();
  const m = document.getElementById('mute');
  m.onclick = () => setMuted(!muted);
  setMuted(muted);
  window.addEventListener('beforeunload', () => { try { autosave(); } catch (e) { } });
  window.addEventListener('pagehide', () => { try { autosave(); } catch (e) { } });
  titleScreen();
})();
