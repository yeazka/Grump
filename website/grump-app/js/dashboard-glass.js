(() => {
  'use strict';

  const home = document.getElementById('v-home');
  const sliders = [...document.querySelectorAll('#v-home .dashboard-glass-slider')];
  if (!home || !sliders.length) return;

  let frame = 0;
  function scheduleRender() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(renderDashboardGlass);
  }

  function renderDashboardGlass() {
    const homeRect = home.getBoundingClientRect();
    const width = Math.round(homeRect.width);
    const height = Math.round(homeRect.height);
    if (!width || !height) return;

    const source = document.createElement('canvas');
    source.width = width;
    source.height = height;
    const sourceContext = source.getContext('2d');
    const glow = sourceContext.createRadialGradient(width * .7, height * .18, 4, width * .7, height * .18, width * .68);
    glow.addColorStop(0, 'rgba(255,255,255,.2)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    sourceContext.fillStyle = glow;
    sourceContext.fillRect(0, 0, width, height);
    sourceContext.save();
    sourceContext.globalAlpha = .1;
    sourceContext.strokeStyle = '#fff';
    sourceContext.lineWidth = 1;
    for (let x = 16; x < width; x += 16) {
      sourceContext.beginPath();
      sourceContext.moveTo(x, 0);
      sourceContext.lineTo(x, height);
      sourceContext.stroke();
    }
    for (let y = 10; y < height; y += 10) {
      sourceContext.beginPath();
      sourceContext.moveTo(0, y);
      sourceContext.lineTo(width, y);
      sourceContext.stroke();
    }
    sourceContext.restore();

    const strength = 40;
    const blurPixels = 3;
    sliders.forEach((slider) => {
      const canvas = slider.querySelector('canvas');
      const sliderRect = slider.getBoundingClientRect();
      const sliderWidth = Math.round(sliderRect.width);
      const sliderHeight = Math.round(sliderRect.height);
      if (!canvas || !sliderWidth || !sliderHeight) return;
      canvas.width = sliderWidth;
      canvas.height = sliderHeight;
      const context = canvas.getContext('2d');
      const offsetX = sliderRect.left - homeRect.left;
      const offsetY = sliderRect.top - homeRect.top;
      const padding = strength + blurPixels * 2 + 4;
      const distorted = document.createElement('canvas');
      distorted.width = sliderWidth + padding * 2;
      distorted.height = sliderHeight;
      const distortedContext = distorted.getContext('2d');
      for (let y = 0; y < sliderHeight; y += 2) {
        const edge = Math.min(y, sliderHeight - y) / (sliderHeight / 2);
        const bend = (1 - edge) * strength * .8 + Math.sin(y / sliderHeight * Math.PI * 2) * strength * .16;
        const rowHeight = Math.min(2, sliderHeight - y);
        const sampleX = Math.max(0, Math.min(width - sliderWidth, offsetX + bend));
        distortedContext.drawImage(source, sampleX, offsetY + y, sliderWidth, rowHeight, padding - bend, y, sliderWidth + bend * 2, rowHeight);
      }
      context.clearRect(0, 0, sliderWidth, sliderHeight);
      context.filter = `blur(${blurPixels}px)`;
      context.drawImage(distorted, -padding, 0);
      context.filter = 'none';
    });
  }

  new ResizeObserver(scheduleRender).observe(home);
  enterHooks.home = scheduleRender;
  scheduleRender();
})();
