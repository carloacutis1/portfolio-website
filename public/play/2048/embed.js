// Touch support for the portfolio copy of 2048.
// A swipe on the board is turned into the matching arrow-key press,
// so game.js handles it exactly like a keyboard move.
(function () {
  const grid = document.getElementById('grid');
  let startX = 0;
  let startY = 0;

  grid.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  grid.addEventListener('touchend', function (e) {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return; // too short to be a swipe

    const key = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft')
      : (dy > 0 ? 'ArrowDown' : 'ArrowUp');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: key, cancelable: true }));
  });

  // When embedded, clicking anywhere in the frame gives it keyboard focus.
  document.addEventListener('pointerdown', function () { window.focus(); });
})();
