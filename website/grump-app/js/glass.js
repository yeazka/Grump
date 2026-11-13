'use strict';
// Live Liquid Glass.
//
// A transparent window cannot blur what is behind it, so the glass is drawn here from a live capture of the screen:
//   1. The window is excluded from the capture (main.js: setContentProtection), so the capture shows only what is BEHIND Grump.
//   2. The capture is a video stream; each new frame becomes a WebGL texture.
//   3. The shader draws, for the shape of the glass: blur (mip levels), refraction that bends the background inward near the
//      edges (the "lens" of Liquid Glass), a little chromatic aberration, a saturation lift, the tint, and a soft rim light.
// Frames and pixels stay on the GPU. Nothing is stored or sent anywhere. If anything fails the CSS glass stays in place.
(() => {
  const bridge = window.dynIsland;
  if (!bridge || typeof bridge.glassSource !== 'function') return;

  const VERT = `#version 300 es
in vec2 aPos; out vec2 vCss;
uniform vec2 uCanvas;
void main(){ vCss = (aPos * 0.5 + 0.5) * uCanvas; vCss.y = uCanvas.y - vCss.y; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `#version 300 es
precision highp float;
in vec2 vCss; out vec4 outColor;
uniform sampler2D uTex;      // the screen behind (video)
uniform sampler2D uMaskTex;  // the glass outline (alpha)
uniform vec4 uMaskRect;      // where the mask sits in the canvas: x, y, w, h (CSS px)
uniform float uFade;         // 0..1, fades the whole glass (popovers fading in and out)
uniform vec2 uCanvas;        // canvas size, CSS px
uniform vec4 uRegion;        // body rectangle: x, y, w, h (CSS px), only used for the top-to-bottom tint gradient
uniform vec2 uOrigin;        // canvas top-left in video pixels
uniform float uScale;        // video pixels per CSS px
uniform vec2 uVideo;         // video size in pixels
uniform vec3 uTint;          // tint colour
uniform vec2 uTintAlpha;     // tint opacity at the top and at the bottom of the region
uniform float uBlur;         // mip level for the blur
uniform float uBevel;        // width of the refracting edge, CSS px
uniform float uRefract;      // how far the edge bends the background, CSS px
uniform float uSat;
uniform float uRim;
uniform float uTopOpen;      // 1 = the shape continues above its top edge (the anchored notch is glued to the screen top): no edge or rim there
uniform float uLift;         // lifts the glass a little so it never reads as a black hole on a dark desktop

float cov(vec2 css){
  vec2 uv = (css - uMaskRect.xy) / uMaskRect.zw;
  if (uTopOpen > 0.5 && uv.y < 0.0) uv.y = 0.0;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
  return texture(uMaskTex, uv).a;
}
vec3 sampleBg(vec2 css, float lod){
  vec2 px = uOrigin + css * uScale;
  return textureLod(uTex, clamp(px / uVideo, vec2(0.001), vec2(0.999)), lod).rgb;
}
void main(){
  float m = cov(vCss);
  if (m <= 0.003) { outColor = vec4(0.0); return; }

  // how close to the outline (works for any shape, flares included) and which way the outline faces
  float R = max(uBevel * 0.55, 1.5);
  vec2 g = vec2(0.0); float a = m;
  for (int i = 0; i < 8; i++) {
    float ang = float(i) * 0.785398;
    vec2 dir = vec2(cos(ang), sin(ang));
    float c = cov(vCss + dir * R);
    a += c; g += dir * (1.0 - c);
  }
  a /= 9.0;
  vec2 n = length(g) > 0.001 ? normalize(g) : vec2(0.0, -1.0);   // points out of the glass
  float edge = 1.0 - smoothstep(0.62, 0.98, a);
  float bend = edge * edge * (1.0 - 0.25 * edge);
  vec2 shift = -n * uRefract * bend;                              // pulls the background in from the edge, like a lens

  float lod = uBlur;
  vec2 o = vec2(1.5, 0.0) * uScale;
  vec3 col;
  if (edge < 0.04) {
    col = (sampleBg(vCss + shift + o.xy, lod) + sampleBg(vCss + shift - o.xy, lod) + sampleBg(vCss + shift + o.yx, lod) + sampleBg(vCss + shift - o.yx, lod)) * 0.25;
  } else {
    vec2 sr = shift * 1.10, sb = shift * 0.90;     // chromatic aberration at the edge
    col.r = (sampleBg(vCss + sr + o.xy, lod).r + sampleBg(vCss + sr - o.xy, lod).r + sampleBg(vCss + sr + o.yx, lod).r + sampleBg(vCss + sr - o.yx, lod).r) * 0.25;
    col.g = (sampleBg(vCss + shift + o.xy, lod).g + sampleBg(vCss + shift - o.xy, lod).g + sampleBg(vCss + shift + o.yx, lod).g + sampleBg(vCss + shift - o.yx, lod).g) * 0.25;
    col.b = (sampleBg(vCss + sb + o.xy, lod).b + sampleBg(vCss + sb - o.xy, lod).b + sampleBg(vCss + sb + o.yx, lod).b + sampleBg(vCss + sb - o.yx, lod).b) * 0.25;
  }

  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, uSat);

  float v = clamp((vCss.y - uRegion.y) / max(uRegion.w, 1.0), 0.0, 1.0);
  col = mix(col, uTint, mix(uTintAlpha.x, uTintAlpha.y, v));

  // light: a soft lift, a sheen from the top, light gathering along the inner edge, and a thin bright rim lit from the top-left
  vec2 L = normalize(vec2(-0.5, -0.85));
  float facing = dot(n, L);
  col += vec3(uLift) + vec3(0.07) * (1.0 - v);
  col += vec3(0.10) * edge * (0.5 + 0.5 * max(facing, 0.0)) * uRim;
  float r2 = 1.6;
  float thin = 1.0 - smoothstep(0.5, 1.0, (m + cov(vCss + vec2(r2, 0.0)) + cov(vCss - vec2(r2, 0.0)) + cov(vCss + vec2(0.0, r2)) + cov(vCss - vec2(0.0, r2))) / 5.0);
  col += vec3(1.0) * thin * (0.22 + 0.55 * max(facing, 0.0) + 0.12 * max(-facing, 0.0)) * uRim;

  col = clamp(col, 0.0, 1.0);
  outColor = vec4(col * m, m) * uFade;
}`;

  const shaderOf = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'shader failed');
    return shader;
  };

  // The desktop is captured at a quarter of its size: the glass only needs a blurred picture, and every frame of a
  // half-size capture cost four times the memory in the capturer, the video element and the texture (the RAM report).
  // The blur is a mip level, so it drops by one level to keep the same look on screen.
  const CAPTURE_DIV = 4;
  // The notch, the dock and the floating lyrics each open their own capture of the same screen, and Chromium runs them at the SLOWEST
  // rate any of them asks for (measured: a dock that wanted 10 frames a second got 1 as long as the closed notch asked for 1, so the glass
  // behind the dock showed the old picture for a second or two after the screen changed). A window that is only waiting therefore never asks
  // for less than this, or it holds every other window back.
  window.GRUMP_GLASS_IDLE_FPS = 5;
  const BLUR_SHIFT = Math.log2(CAPTURE_DIV / 2);
  class LiveGlass {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = null; this.program = null; this.texture = null; this.uniforms = {};
      this.video = null; this.stream = null; this.bounds = null; this.scale = 1;
      this.running = false; this.frameDirty = true; this.lastSig = ''; this.rafId = 0; this.videoCallback = 0;
      this.region = null; this.onFail = null; this.fps = 0;
    }

    async start() {
      if (this.running) return true;
      try {
        const source = await bridge.glassSource();
        if (!source) throw new Error('no capture source');
        this.bounds = source.bounds;
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: source.id, maxWidth: Math.max(320, Math.round(source.bounds.width / CAPTURE_DIV)), maxHeight: Math.max(180, Math.round(source.bounds.height / CAPTURE_DIV)), maxFrameRate: 8 } },
        });
        this.stream = stream;
        const video = document.createElement('video');
        video.muted = true; video.playsInline = true; video.srcObject = stream;
        await video.play();
        this.video = video;
        this.initGl();
        this.running = true;
        this.listenFrames();
        this.loop();
        return true;
      } catch (error) {
        this.stop();
        if (this.onFail) this.onFail(error);
        return false;
      }
    }

    initGl() {
      const gl = this.canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
      if (!gl) throw new Error('webgl2 unavailable');
      this.gl = gl;
      const program = gl.createProgram();
      gl.attachShader(program, shaderOf(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, shaderOf(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'link failed');
      this.program = program;
      gl.useProgram(program);
      for (const name of ['uTex', 'uMaskTex', 'uCanvas', 'uRegion', 'uOrigin', 'uScale', 'uVideo', 'uTint', 'uTintAlpha', 'uBlur', 'uBevel', 'uRefract', 'uSat', 'uRim', 'uLift', 'uTopOpen', 'uMaskRect', 'uFade']) this.uniforms[name] = gl.getUniformLocation(program, name);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(program, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(this.uniforms.uTex, 0);
      // the outline of the glass, drawn with a 2D canvas (an SVG path or a rounded rectangle) and used as a texture
      this.maskCanvas = document.createElement('canvas');
      this.maskCtx = this.maskCanvas.getContext('2d');
      this.maskTexture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(this.uniforms.uMaskTex, 1);
      gl.activeTexture(gl.TEXTURE0);
      this.shapeKey = '';
      gl.disable(gl.BLEND);
      this.canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); this.stop(); if (this.onFail) this.onFail(new Error('context lost')); });
    }

    // New video frames are uploaded only when one has actually arrived (a still desktop sends few).
    listenFrames() {
      const video = this.video;
      if (!video || typeof video.requestVideoFrameCallback !== 'function') { this.frameDirty = true; this.polling = true; return; }
      const onFrame = () => { this.frameDirty = true; this.fps++; if (this.running) this.videoCallback = video.requestVideoFrameCallback(onFrame); };
      this.videoCallback = video.requestVideoFrameCallback(onFrame);
    }

    setFrameRate(rate) {
      const track = this.stream && this.stream.getVideoTracks()[0];
      if (track && track.applyConstraints) track.applyConstraints({ frameRate: rate }).catch(() => {});
    }

    // opts: { rect: {left, top, width, height} of the canvas in the window (CSS px), region: {x, y, w, h}, radii: [tl, tr, br, bl],
    //         tint: [r, g, b], tintAlpha: [top, bottom], blur, bevel, refract, sat, rim }
    draw(opts) {
      if (!this.running || !this.gl || !this.video || this.video.readyState < 2) return;
      const { gl, canvas } = this;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = Math.max(1, Math.round(opts.rect.width)), cssH = Math.max(1, Math.round(opts.rect.height));
      const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
      let resized = false;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; resized = true; } // only on real change: a resize loop can break the transparent compositor
      const originX = window.screenX - this.bounds.x + opts.rect.left, originY = window.screenY - this.bounds.y + opts.rect.top;
      const sig = [cssW, cssH, originX.toFixed(1), originY.toFixed(1), opts.region.x.toFixed(1), opts.region.y.toFixed(1), opts.region.w.toFixed(1), opts.region.h.toFixed(1), opts.shapeKey, opts.tint.join(','), opts.tintAlpha.join(','), opts.blur, opts.refract, opts.sat, opts.lift].join('|');
      if (!this.frameDirty && !resized && sig === this.lastSig) return;
      this.lastSig = sig;
      if (this.frameDirty) {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);
        gl.generateMipmap(gl.TEXTURE_2D);
        this.frameDirty = false;
      }
      if (this.shapeKey !== opts.shapeKey || resized) {
        const mc = this.maskCanvas, ctx = this.maskCtx;
        if (mc.width !== cssW || mc.height !== cssH) { mc.width = cssW; mc.height = cssH; }
        ctx.clearRect(0, 0, cssW, cssH);
        ctx.fillStyle = '#fff';
        if (opts.shape.d) ctx.fill(new Path2D(opts.shape.d));
        else { ctx.beginPath(); ctx.roundRect(opts.shape.x, opts.shape.y, opts.shape.w, opts.shape.h, opts.shape.r); ctx.fill(); }
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mc);
        gl.activeTexture(gl.TEXTURE0);
        this.shapeKey = opts.shapeKey;
      }
      const u = this.uniforms, scale = this.video.videoWidth / this.bounds.width;
      gl.disable(gl.SCISSOR_TEST); gl.disable(gl.BLEND);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.maskTexture); gl.activeTexture(gl.TEXTURE0);
      gl.uniform4f(u.uMaskRect, 0, 0, cssW, cssH);
      gl.uniform1f(u.uFade, 1);
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.uCanvas, cssW, cssH);
      gl.uniform4f(u.uRegion, opts.region.x, opts.region.y, opts.region.w, opts.region.h);
      gl.uniform2f(u.uOrigin, originX * scale, originY * scale);
      gl.uniform1f(u.uScale, scale);
      gl.uniform2f(u.uVideo, this.video.videoWidth, this.video.videoHeight);
      gl.uniform3f(u.uTint, opts.tint[0], opts.tint[1], opts.tint[2]);
      gl.uniform2f(u.uTintAlpha, opts.tintAlpha[0], opts.tintAlpha[1]);
      gl.uniform1f(u.uBlur, Math.max(0, opts.blur - BLUR_SHIFT));
      gl.uniform1f(u.uBevel, opts.bevel);
      gl.uniform1f(u.uRefract, opts.refract);
      gl.uniform1f(u.uSat, opts.sat);
      gl.uniform1f(u.uRim, opts.rim == null ? 1 : opts.rim);
      gl.uniform1f(u.uLift, opts.lift == null ? 0.04 : opts.lift);
      gl.uniform1f(u.uTopOpen, opts.topOpen ? 1 : 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // info: { left, top, width, height } of the canvas in the window (CSS px).
    // shapes: [{ id, x, y, w, h, r, tint:[r,g,b], tintAlpha:[top,bottom], blur, bevel, refract, sat, lift, fade }] in canvas CSS px.
    drawMulti(info, shapes) {
      if (!this.running || !this.gl || !this.video || this.video.readyState < 2) return;
      const { gl, canvas } = this;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = Math.max(1, Math.round(info.width)), cssH = Math.max(1, Math.round(info.height));
      const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
      let resized = false;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; resized = true; }
      const originX = window.screenX - this.bounds.x + info.left, originY = window.screenY - this.bounds.y + info.top;
      const sig = [cssW, cssH, originX.toFixed(1), originY.toFixed(1)].join('|') + '#' + shapes.map((s) => [s.id, s.x.toFixed(1), s.y.toFixed(1), s.w.toFixed(1), s.h.toFixed(1), s.r.toFixed(1), s.fade.toFixed(2), s.tintAlpha.join(','), s.tint.join(','), s.blur, s.sat, s.lift].join(',')).join('|');
      if (!this.frameDirty && !resized && sig === this.lastSig) return;
      this.lastSig = sig;
      if (this.frameDirty) {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);
        gl.generateMipmap(gl.TEXTURE_2D);
        this.frameDirty = false;
      }
      const u = this.uniforms, scale = this.video.videoWidth / this.bounds.width;
      gl.viewport(0, 0, w, h);
      gl.disable(gl.SCISSOR_TEST);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.SCISSOR_TEST);
      gl.uniform2f(u.uCanvas, cssW, cssH);
      gl.uniform2f(u.uOrigin, originX * scale, originY * scale);
      gl.uniform1f(u.uScale, scale);
      gl.uniform2f(u.uVideo, this.video.videoWidth, this.video.videoHeight);
      this.maskCache = this.maskCache || new Map();
      const live = new Set();
      for (const s of shapes) {
        live.add(s.id);
        const pad = 4, bx = Math.floor(s.x - pad), by = Math.floor(s.y - pad), bw = Math.ceil(s.w + pad * 2), bh = Math.ceil(s.h + pad * 2);
        let entry = this.maskCache.get(s.id);
        if (!entry) { entry = { tex: gl.createTexture(), key: '' }; this.maskCache.set(s.id, entry); }
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, entry.tex);
        const key = [bw, bh, s.w.toFixed(1), s.h.toFixed(1), s.r.toFixed(1)].join(',');
        if (entry.key !== key) {
          const mc = this.maskCanvas, ctx = this.maskCtx;
          mc.width = bw; mc.height = bh;
          ctx.clearRect(0, 0, bw, bh);
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.roundRect(s.x - bx, s.y - by, s.w, s.h, s.r); ctx.fill();
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mc);
          entry.key = key;
        } else if (entry.pos !== bx + ',' + by) { /* the mask is relative to its own box: moving it needs no new upload */ }
        entry.pos = bx + ',' + by;
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform4f(u.uMaskRect, bx, by, bw, bh);
        gl.uniform4f(u.uRegion, s.x, s.y, s.w, s.h);
        gl.uniform3f(u.uTint, s.tint[0], s.tint[1], s.tint[2]);
        gl.uniform2f(u.uTintAlpha, s.tintAlpha[0], s.tintAlpha[1]);
        gl.uniform1f(u.uBlur, Math.max(0, s.blur - BLUR_SHIFT));
        gl.uniform1f(u.uBevel, s.bevel);
        gl.uniform1f(u.uRefract, s.refract);
        gl.uniform1f(u.uSat, s.sat);
        gl.uniform1f(u.uRim, 1);
        gl.uniform1f(u.uLift, s.lift);
        gl.uniform1f(u.uFade, s.fade);
        gl.scissor(Math.max(0, Math.floor(bx * dpr)), Math.max(0, Math.floor((cssH - (by + bh)) * dpr)), Math.ceil(bw * dpr), Math.ceil(bh * dpr));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      gl.disable(gl.SCISSOR_TEST);
      gl.disable(gl.BLEND);
      for (const [id, entry] of this.maskCache) if (!live.has(id) && this.maskCache.size > 12) { gl.deleteTexture(entry.tex); this.maskCache.delete(id); }
    }

    loop() {
      const step = () => {
        if (!this.running) return;
        if (this.polling) this.frameDirty = true;
        if (typeof this.onFrame === 'function') { try { this.onFrame(); } catch (error) { console.error('glass frame', error); } }
        this.rafId = requestAnimationFrame(step);
      };
      this.rafId = requestAnimationFrame(step);
    }

    clear() {
      if (!this.gl) return;
      this.gl.clearColor(0, 0, 0, 0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      this.lastSig = '';
    }

    stop() {
      this.running = false;
      cancelAnimationFrame(this.rafId);
      try { if (this.video && this.videoCallback && this.video.cancelVideoFrameCallback) this.video.cancelVideoFrameCallback(this.videoCallback); } catch (_) { /* nothing to cancel */ }
      if (this.stream) this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
      if (this.video) { this.video.srcObject = null; this.video = null; }
      const gl = this.gl;
      if (gl) { try { if (this.texture) gl.deleteTexture(this.texture); if (this.program) gl.deleteProgram(this.program); } catch (_) { /* context already gone */ } }
      this.gl = null; this.program = null; this.texture = null; this.maskTexture = null; this.shapeKey = ''; this.maskCache = null;
    }
  }

  LiveGlass.MODES = {
    dark:   { tint: [9, 9, 12],      closed: 0.54, blur: 4.2, sat: 1.1,  lift: 0.055 },
    bright: { tint: [226, 228, 236], closed: 0.26, blur: 3.8, sat: 1.25, lift: 0.03 },
    clear:  { tint: [255, 255, 255], closed: 0.06, blur: 3.2, sat: 1.3,  lift: 0.025 },
  };
  window.GrumpLiveGlass = LiveGlass;
})();
