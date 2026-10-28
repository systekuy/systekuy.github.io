// Textos que genera JS, según el idioma de la página (<html lang>)
var EN = /^en/i.test(document.documentElement.lang);
var T = EN ? {
  hint: "No spam. I only use your details to reply to you.",
  sending: "Sending message...",
  error: "Couldn't send it. Please try again later.",
  toDark: "Switch to dark mode",
  toLight: "Switch to light mode"
} : {
  hint: "No mando spam. Uso tus datos solo para responderte.",
  sending: "Enviando mensaje...",
  error: "Error al enviar. Intentá de nuevo más tarde.",
  toDark: "Cambiar a modo oscuro",
  toLight: "Cambiar a modo claro"
};

function showFormSuccess() {
  const fields = document.getElementById("contact-form-fields");
  const success = document.getElementById("contact-form-success");
  if (fields) fields.hidden = true;
  if (success) success.hidden = false;
}

function showFormFields() {
  const form = document.getElementById("contact-form");
  const fields = document.getElementById("contact-form-fields");
  const success = document.getElementById("contact-form-success");
  const hint = document.getElementById("form-hint");

  if (success) success.hidden = true;
  if (fields) fields.hidden = false;
  if (form) form.reset();
  if (hint) {
    hint.textContent = T.hint;
    hint.classList.remove("is-error");
  }
}

function handleSubmit(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const form = document.getElementById("contact-form");
  if (!form) return false;

  if (!form.checkValidity()) {
    form.reportValidity();
    return false;
  }

  const hint = document.getElementById("form-hint");
  const submitBtn = document.getElementById("contact-submit");
  const endpoint = form.getAttribute("data-endpoint") || "https://formspree.io/f/meeyvgoj";

  if (hint) {
    hint.textContent = T.sending;
    hint.classList.remove("is-error");
  }
  if (submitBtn) submitBtn.disabled = true;

  fetch(endpoint, {
    method: "POST",
    body: new FormData(form),
    headers: {
      Accept: "application/json"
    }
  })
    .then(function (response) {
      if (response.ok) {
        showFormSuccess();
        return null;
      }
      return response.json().then(function (data) {
        var errMsg = "Error al enviar el formulario";
        if (data && data.error) errMsg = data.error;
        else if (data && data.errors && data.errors[0] && data.errors[0].message) {
          errMsg = data.errors[0].message;
        }
        throw new Error(errMsg);
      }).catch(function (err) {
        if (err && err.message && err.message !== "Error al enviar el formulario") throw err;
        throw new Error("Error al enviar el formulario");
      });
    })
    .catch(function (err) {
      console.error("Error al enviar formulario:", err);
      if (hint) {
        hint.textContent = T.error;
        hint.classList.add("is-error");
      }
    })
    .finally(function () {
      if (submitBtn) submitBtn.disabled = false;
    });

  return false;
}

function isLight() {
  return document.documentElement.getAttribute("data-theme") === "light";
}

function initThemeToggle() {
  var button = document.querySelector("[data-theme-toggle]");
  if (!button) return;
  var root = document.documentElement;
  var metaTheme = document.querySelector('meta[name="theme-color"]');

  function sync() {
    var light = isLight();
    button.setAttribute("aria-label", light ? T.toDark : T.toLight);
    if (metaTheme) metaTheme.setAttribute("content", light ? "#eef2f8" : "#0f172a");
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {}
    sync();
  }

  button.addEventListener("click", function () {
    var next = isLight() ? "dark" : "light";
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!document.startViewTransition || reduceMotion) {
      apply(next);
      return;
    }

    // El círculo del cambio de tema sale desde el botón. Se anima desde JS con los px ya calculados:
    // Safari no hereda variables CSS en ::view-transition-new y el círculo salía de arriba al centro
    var rect = button.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    var at = " at " + x + "px " + y + "px)";
    var transition = document.startViewTransition(function () {
      apply(next);
    });
    transition.ready
      .then(function () {
        root.animate(
          { clipPath: ["circle(0px" + at, "circle(" + radius + "px" + at] },
          {
            duration: 600,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            pseudoElement: "::view-transition-new(root)"
          }
        );
      })
      .catch(function () {});
  });

  sync();
}

function initNavbarScroll() {
  var nav = document.querySelector(".nav");
  if (!nav) return;

  // Se despega al bajar de 60px y se vuelve a encastrar recién por encima de 16px (evita parpadeo en el borde)
  function updateNav() {
    var y = window.scrollY;
    if (y > 60) {
      nav.classList.add("is-scrolled");
    } else if (y < 16) {
      nav.classList.remove("is-scrolled");
    }
  }

  updateNav();
  window.addEventListener("scroll", updateNav, { passive: true });
}

// Fondo del hero: la malla de líneas de siempre, pero con una dimensión más. Es una tela en 3D que ondula
// en profundidad, se retuerce sobre sí misma y gira despacio frente a la cámara. El cursor la toca apenas:
// brilla un poco y aparta los hilos; si te quedás, el hueco se abre de a poco y se cierra solo al irte.
// Todo se calcula en la GPU (WebGL sin librerías): JS solo actualiza unos pocos uniforms por cuadro
function initHeroMesh() {
  var canvas = document.getElementById("hero-mesh");
  var hero = document.querySelector(".hero");
  if (!canvas || !hero) return;

  var gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: true });
  if (!gl) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);

  // Líneas de la malla: horizontales (H) y verticales (V), cada una muestreada en SAMPLES puntos.
  // Las verticales salen de la proporción de la tela (ver uExtent) para que los cuadros queden parejos
  var rect0 = hero.getBoundingClientRect();
  var aspect0 = Math.max(0.45, Math.min(2.4, rect0.width / Math.max(1, rect0.height)));
  var H_LINES = small ? 56 : 50;
  var V_LINES = Math.round(((H_LINES * (aspect0 * 1.6 + 0.4)) / 2.4) * 0.85);
  var SAMPLES = small ? 90 : 150;
  var TRAIL = small ? 12 : 24; // huecos del cursor: el actual + los que va dejando atrás mientras se cierran
  var count = (H_LINES + V_LINES) * SAMPLES;

  // Mismos colores que la malla de antes: horizontales celestes/azules y verticales violetas
  var PALETTES = {
    dark: { h: [0.49, 0.83, 0.99], v: [0.65, 0.55, 0.98], glow: [0.85, 0.95, 1], line: 0.3, point: 0.5, additive: true },
    light: { h: [0.15, 0.39, 0.92], v: [0.49, 0.23, 0.93], glow: [0.05, 0.6, 0.85], line: 0.38, point: 0.45, additive: false }
  };

  var VERTEX = [
    "#define TRAIL " + TRAIL,
    "#define CAM 2.6",
    "attribute vec4 aGrid;", // u, v (de -1 a 1), 0 = horizontal / 1 = vertical, avance a lo largo de la línea
    "attribute vec2 aSeed;", // azar, fase del pulso (0 = la línea no lleva pulsos)
    "uniform vec2 uView;",
    "uniform vec2 uExtent;",
    "uniform float uDpr;",
    "uniform float uTime;",
    "uniform float uLines;",
    "uniform float uLineBoost;",
    "uniform vec4 uCam;", // cos/sen del giro y de la inclinación de la cámara
    "uniform vec4 uTrail[TRAIL];", // x, y, fuerza, radio
    "uniform vec3 uColH, uColV, uGlow;",
    "uniform vec2 uAlpha;", // líneas, puntos
    "varying vec4 vColor;",
    "varying float vSprite;",
    "void main() {",
    "  vec2 p = aGrid.xy * uExtent;",
    "  float t = uTime;",
    // Ondas que cruzan la malla, como antes, pero ahora en profundidad
    "  float z = 0.26 * sin(p.x * 1.5 + p.y * 0.5 + t * 0.7)",
    "          + 0.18 * sin(p.y * 2.1 - t * 0.55)",
    "          + 0.08 * sin((p.x - p.y) * 3.1 + t * 1.0);",
    // Un oleaje grande y lento que recorre la tela
    "  vec2 c = vec2(0.9 * sin(t * 0.13), 0.5 * cos(t * 0.1));",
    "  vec2 dc = p - c;",
    "  z += 0.38 * sin(length(dc) * 2.0 - t * 0.8) * exp(-dot(dc, dc) * 0.22);",
    // La dimensión de más: la tela se retuerce sobre sí misma a lo largo del ancho
    "  float th = 0.6 * sin(p.x * 0.55 + t * 0.17);",
    "  vec3 q = vec3(p.x, p.y * cos(th) - z * sin(th), p.y * sin(th) + z * cos(th));",
    // Cámara que gira despacio y perspectiva
    "  float x1 = q.x * uCam.x + q.z * uCam.y;",
    "  float z1 = q.z * uCam.x - q.x * uCam.y;",
    "  float y2 = q.y * uCam.z - z1 * uCam.w;",
    "  float z2 = q.y * uCam.w + z1 * uCam.z;",
    "  float persp = CAM / max(CAM + z2, 0.4);",
    "  vec2 pos = uView * 0.5 + vec2(x1, -y2) * persp * uView.y * 0.5;",
    // Cursor: cada hueco aparta los hilos; cuanto más fuerza junta, más se desvía cada punto por su lado
    "  float lit = 0.0;",
    "  for (int i = 0; i < TRAIL; i++) {",
    "    vec4 h = uTrail[i];",
    "    if (h.z > 0.003) {",
    "      vec2 d = pos - h.xy;",
    "      float dist = length(d) + 0.001;",
    "      float fall = exp(-dist * dist / (h.w * h.w));",
    "      vec2 n = d / dist;",
    "      vec2 dir = n + vec2(-n.y, n.x) * (aSeed.x - 0.5) * h.z;",
    "      pos += dir * h.z * h.w * 0.9 * fall * (1.0 + (aSeed.x - 0.5) * h.z);",
    "      lit = max(lit, h.z * fall);",
    "    }",
    "  }",
    // Brillo: más cerca = más fuerte, se apaga en los bordes de la tela y crece hacia abajo como antes
    "  float near = clamp(persp, 0.45, 1.6);",
    "  near *= near;",
    "  float edge = smoothstep(1.0, 0.8, max(abs(aGrid.x), abs(aGrid.y)));",
    "  float grad = 0.55 + 0.45 * (aGrid.y * 0.5 + 0.5);",
    "  float pulse = aSeed.y > 0.0 ? pow(0.5 + 0.5 * sin(aGrid.w * 12.566 - t * 1.2 + aSeed.y), 24.0) : 0.0;",
    "  float alpha = (uLines > 0.5 ? uAlpha.x * uLineBoost : uAlpha.y) * near * grad + pulse * 0.45 + lit * 0.25;",
    // Donde el hueco ya juntó fuerza, los hilos se cortan
    "  if (uLines > 0.5) alpha *= 1.0 - smoothstep(0.35, 0.85, lit);",
    "  alpha *= edge * clamp((uView.y - pos.y) / (uView.y * 0.28), 0.0, 1.0);", // difuminado de abajo
    "  vec3 col = mix(mix(uColH, uColV, aGrid.z), uGlow, lit * 0.6 + pulse * 0.4);",
    "  gl_PointSize = (aSeed.x < 0.04 ? 3.0 : 1.5) * near * (1.0 + lit + pulse) * uDpr;",
    "  gl_Position = vec4(pos.x / uView.x * 2.0 - 1.0, 1.0 - pos.y / uView.y * 2.0, 0.0, 1.0);",
    "  vColor = vec4(col * alpha, alpha);",
    "  vSprite = 1.0 - uLines;",
    "}"
  ].join("\n");

  var FRAGMENT = [
    "precision mediump float;",
    "varying vec4 vColor;",
    "varying float vSprite;",
    "void main() {",
    "  float f = 1.0;",
    "  if (vSprite > 0.5) {",
    "    vec2 d = gl_PointCoord - 0.5;",
    "    float r2 = dot(d, d) * 4.0;",
    "    if (r2 > 1.0) discard;",
    "    f = exp(-r2 * 3.0) * (1.0 - r2);",
    "  }",
    "  gl_FragColor = vColor * f;",
    "}"
  ].join("\n");

  // Datos fijos de cada punto (la posición se calcula en el shader) y los tramos entre puntos vecinos
  var data = new Float32Array(count * 6);
  var lineIdx = new Uint16Array((H_LINES + V_LINES) * (SAMPLES - 1) * 2);
  var k = 0;
  var e = 0;
  var vert = 0;
  for (var line = 0; line < H_LINES + V_LINES; line++) {
    var vertical = line >= H_LINES;
    var across = vertical ? ((line - H_LINES) / (V_LINES - 1)) * 2 - 1 : (line / (H_LINES - 1)) * 2 - 1;
    var pulsePhase = Math.random() < 0.2 ? 0.01 + Math.random() * 6.28 : 0;
    for (var s = 0; s < SAMPLES; s++, vert++) {
      var along = s / (SAMPLES - 1);
      data[k++] = vertical ? across : along * 2 - 1;
      data[k++] = vertical ? along * 2 - 1 : across;
      data[k++] = vertical ? 1 : 0;
      data[k++] = along;
      data[k++] = Math.random();
      data[k++] = pulsePhase;
      if (s > 0) {
        lineIdx[e++] = vert - 1;
        lineIdx[e++] = vert;
      }
    }
  }

  var trail = new Float32Array(TRAIL * 4);
  var head = -1; // hueco que sigue al cursor
  var width = 0;
  var height = 0;
  var radius = 60;
  var pointer = { x: 0, y: 0, active: false };
  var tilt = { x: 0, y: 0 };
  var time = 4;
  var last = 0;
  var theme = null;
  var program = null;
  var loc = {};
  var lost = false;
  var visible = true;
  var rafId = null;

  function compile(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }

  function setupGL() {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, lineIdx, gl.STATIC_DRAW);
    [["aGrid", 4, 0], ["aSeed", 2, 16]].forEach(function (attr) {
      var at = gl.getAttribLocation(program, attr[0]);
      gl.enableVertexAttribArray(at);
      gl.vertexAttribPointer(at, attr[1], gl.FLOAT, false, 24, attr[2]);
    });
    [
      "uView", "uExtent", "uDpr", "uTime", "uLines", "uLineBoost", "uCam", "uTrail",
      "uColH", "uColV", "uGlow", "uAlpha"
    ].forEach(function (name) {
      loc[name] = gl.getUniformLocation(program, name);
    });

    gl.enable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.viewport(0, 0, canvas.width, canvas.height);
    // En pantallas retina la línea de 1px físico queda muy fina: un poco más de alfa la compensa
    gl.uniform1f(loc.uLineBoost, dpr > 1.5 ? 1.5 : 1);
    theme = null;
    return true;
  }

  function applyTheme() {
    var name = isLight() ? "light" : "dark";
    if (name === theme) return;
    theme = name;
    var pal = PALETTES[name];
    gl.uniform3fv(loc.uColH, pal.h);
    gl.uniform3fv(loc.uColV, pal.v);
    gl.uniform3fv(loc.uGlow, pal.glow);
    gl.uniform2f(loc.uAlpha, pal.line, pal.point);
    // Oscuro: luz que se suma. Claro: tinta que se superpone (sumar luz sobre blanco no se vería)
    if (pal.additive) gl.blendFunc(gl.ONE, gl.ONE);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  // Devuelve false si el hero no cambió de tamaño: en celular, "resize" salta con cada scroll
  // (se esconde/aparece la barra del navegador) y recrear el canvas ahí da tirones
  function resize() {
    var rect = hero.getBoundingClientRect();
    var w = Math.max(1, Math.floor(rect.width));
    var h = Math.max(1, Math.floor(rect.height));
    if (w === width && h === height) return false;
    width = w;
    height = h;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    gl.viewport(0, 0, canvas.width, canvas.height);
    radius = width < 760 ? 48 : 60;
    return true;
  }

  // Ocupa el lugar del hueco más cerrado (nunca el que sigue al cursor)
  function spawnHole(x, y, strength) {
    var slot = -1;
    for (var j = 0; j < TRAIL; j++) {
      if (j === head) continue;
      if (slot < 0 || trail[j * 4 + 2] < trail[slot * 4 + 2]) slot = j;
    }
    trail[slot * 4] = x;
    trail[slot * 4 + 1] = y;
    trail[slot * 4 + 2] = strength;
    trail[slot * 4 + 3] = radius;
    return slot;
  }

  function schedule() {
    if (rafId === null && !lost) rafId = requestAnimationFrame(drawFrame);
  }

  function drawFrame(now) {
    rafId = null;
    if (lost) return;
    var dt = last ? Math.min(0.05, Math.max(0.001, (now - last) / 1000)) : 1 / 60;
    last = now || 0;
    if (!reduceMotion) time += dt;
    applyTheme();

    // Los huecos que quedaron atrás se cierran solos en un par de segundos
    var heal = Math.exp(-dt * 1.2);
    for (var j = 0; j < TRAIL; j++) {
      if (j !== head) trail[j * 4 + 2] *= heal;
    }
    if (pointer.active) {
      if (head < 0) {
        head = spawnHole(pointer.x, pointer.y, 0.12);
      } else if (Math.hypot(pointer.x - trail[head * 4], pointer.y - trail[head * 4 + 1]) > radius * 0.4) {
        // El cursor se movió: el hueco anterior queda atrás cerrándose y arranca uno nuevo, más suave
        head = spawnHole(pointer.x, pointer.y, Math.max(0.12, trail[head * 4 + 2] * 0.5));
      }
      // Mientras el cursor se queda quieto, el hueco se abre (y se deshilacha) de a poco
      trail[head * 4 + 2] += (1 - trail[head * 4 + 2]) * (1 - Math.exp(-dt * 0.45));
    } else {
      head = -1;
    }

    // Paralaje leve: la tela se inclina hacia el cursor
    var ease = Math.min(1, dt * 1.8);
    tilt.x += ((pointer.active ? pointer.x / width - 0.5 : 0) - tilt.x) * ease;
    tilt.y += ((pointer.active ? pointer.y / height - 0.5 : 0) - tilt.y) * ease;
    // Arriba la tela se aleja (inclinación positiva): así se lee la profundidad
    var yaw = 0.3 * Math.sin(time * 0.06) + tilt.x * 0.25;
    var pitch = 0.22 + 0.08 * Math.sin(time * 0.045) + tilt.y * 0.12;

    gl.uniform2f(loc.uView, width, height);
    // La tela es más grande que el hero para que al girar y retorcerse nunca se le vean los bordes
    gl.uniform2f(loc.uExtent, (width / height) * 1.6 + 0.4, 2.4);
    gl.uniform1f(loc.uDpr, dpr);
    gl.uniform1f(loc.uTime, time);
    gl.uniform4f(loc.uCam, Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch));
    gl.uniform4fv(loc.uTrail, trail);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(loc.uLines, 1);
    gl.drawElements(gl.LINES, lineIdx.length, gl.UNSIGNED_SHORT, 0);
    gl.uniform1f(loc.uLines, 0);
    gl.drawArrays(gl.POINTS, 0, count);

    if (!reduceMotion && visible) schedule();
  }

  function onPointerMove(event) {
    var point = event.touches ? event.touches[0] : event;
    var rect = hero.getBoundingClientRect();
    pointer.x = point.clientX - rect.left;
    pointer.y = point.clientY - rect.top;
    pointer.active = true;
  }

  function onPointerLeave() {
    pointer.active = false;
  }

  resize();
  if (!setupGL()) return;
  drawFrame(0);

  // Pausa cuando el hero sale de pantalla
  if (!reduceMotion && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) schedule();
    }).observe(hero);
  }

  // Sin animación, el cuadro quieto se vuelve a pintar al cambiar de tema
  if (reduceMotion) {
    new MutationObserver(function () {
      drawFrame(0);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  window.addEventListener("resize", function () {
    if (resize() && reduceMotion) drawFrame(0);
  });

  canvas.addEventListener("webglcontextlost", function (event) {
    event.preventDefault();
    lost = true;
  });
  canvas.addEventListener("webglcontextrestored", function () {
    lost = false;
    if (setupGL()) schedule();
  });

  if (reduceMotion) return;
  hero.addEventListener("mousemove", onPointerMove, { passive: true });
  hero.addEventListener("touchmove", onPointerMove, { passive: true });
  hero.addEventListener("mouseleave", onPointerLeave);
  hero.addEventListener("touchend", onPointerLeave);
}

function setAccordionItemOpen(item, open) {
  var toggle = item.querySelector("[data-accordion-toggle]");
  item.classList.toggle("is-open", open);
  if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
}

function initAccordions() {
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // En el HTML los paneles vienen abiertos (para crawlers / sin JS); acá se colapsan
  document.querySelectorAll("[data-accordion]").forEach(function (accordion) {
    var isPhone = window.matchMedia("(max-width: 640px)").matches;
    var openFirst = accordion.getAttribute("data-accordion") === "first-open" && !isPhone;
    var hoverOpen = canHover && accordion.hasAttribute("data-hover-open");
    var items = accordion.querySelectorAll("[data-accordion-item]");

    items.forEach(function (item, index) {
      setAccordionItemOpen(item, openFirst && index === 0);
      var toggle = item.querySelector("[data-accordion-toggle]");
      if (!toggle) return;
      toggle.addEventListener("click", function (event) {
        var isOpen = item.classList.contains("is-open");
        // Donde se abre con hover, un click de mouse no cierra lo que el hover acaba de abrir (teclado: detail 0)
        if (hoverOpen && isOpen && event.detail > 0) return;
        setAccordionItemOpen(item, !isOpen);
      });
    });

    accordion.setAttribute("data-accordion-ready", "");
  });
}

function initCounters() {
  var counters = document.querySelectorAll("[data-count]");
  if (!counters.length || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  function render(el, value) {
    el.textContent = (el.getAttribute("data-prefix") || "") + value;
  }

  function run(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var duration = 1400;
    var start = null;
    function frame(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / duration, 1);
      render(el, Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  counters.forEach(function (el) {
    render(el, 0);
  });

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.6 }
  );
  counters.forEach(function (el) {
    observer.observe(el);
  });
}

function initReels() {
  var root = document.querySelector("[data-reels]");
  if (!root) return;

  var reels = [];
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.querySelectorAll(".reel").forEach(function (reelEl) {
    var strip = reelEl.querySelector(".reel-strip");
    var nameEl = reelEl.querySelector(".reel-name");
    if (!strip || !nameEl) return;
    var originals = Array.prototype.slice.call(strip.children);
    var count = originals.length;
    if (count < 2) return;

    var names = originals.map(function (li) {
      var img = li.querySelector("img");
      return img ? img.alt : "";
    });

    if (reduceMotion) {
      nameEl.textContent = names.join(" · ");
      return;
    }

    // Clones en los bordes para que el giro sea infinito: [último] 1..n [primero]
    function clone(li) {
      var copy = li.cloneNode(true);
      copy.classList.remove("is-focus");
      copy.setAttribute("aria-hidden", "true");
      var img = copy.querySelector("img");
      if (img) img.alt = "";
      return copy;
    }
    strip.insertBefore(clone(originals[count - 1]), strip.firstChild);
    strip.appendChild(clone(originals[0]));

    reels.push({ strip: strip, nameEl: nameEl, names: names, count: count, pos: 1 });
  });

  if (!reels.length) return;

  function place(reel, animate) {
    var items = reel.strip.children;
    var itemH = items[0].offsetHeight;
    var offset = itemH * 0.3 - reel.pos * itemH;
    reel.strip.classList.toggle("no-anim", !animate);
    reel.strip.style.transform = "translateY(" + offset + "px)";
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle("is-focus", i === reel.pos);
    }
  }

  function settle(reel) {
    // Llegó al clon del primero: salto sin animación al original
    if (reel.pos > reel.count) {
      reel.pos = 1;
      place(reel, false);
      void reel.strip.offsetHeight;
    }
  }

  function spin(reel) {
    settle(reel);
    reel.pos += 1;
    place(reel, true);
    var index = (reel.pos - 1) % reel.count;
    reel.nameEl.classList.remove("is-swap");
    void reel.nameEl.offsetWidth;
    reel.nameEl.textContent = reel.names[index];
    reel.nameEl.classList.add("is-swap");
  }

  reels.forEach(function (reel) {
    place(reel, false);
    reel.strip.addEventListener("transitionend", function (event) {
      if (event.target === reel.strip) settle(reel);
    });
  });

  var timer = null;
  var kickoff = null;
  var pending = [];
  var inView = false;

  function tick() {
    // Efecto tragamonedas: las columnas cambian en cascada, de izquierda a derecha
    pending.forEach(clearTimeout);
    pending = [];
    reels.forEach(function (reel, i) {
      pending.push(setTimeout(function () { spin(reel); }, i * 160));
    });
  }

  function start() {
    if (timer || kickoff) return;
    // Primer giro casi apenas aparece en pantalla (antes esperaba 3s y se podía pasar de largo sin verlo moverse)
    kickoff = setTimeout(function () {
      kickoff = null;
      tick();
      timer = setInterval(tick, 2600);
    }, 350);
  }

  function stop() {
    clearTimeout(kickoff);
    kickoff = null;
    clearInterval(timer);
    timer = null;
    pending.forEach(clearTimeout);
    pending = [];
    reels.forEach(function (reel) {
      settle(reel);
    });
  }

  // Solo si cambia el ancho: en celular el scroll dispara "resize" (barra del navegador) y los rodillos saltaban a mitad del giro
  var lastWidth = window.innerWidth;
  window.addEventListener("resize", function () {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    reels.forEach(function (reel) {
      settle(reel);
      place(reel, false);
    });
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else if (inView) start();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView && !document.hidden) start();
      else stop();
    }).observe(root);
  } else {
    inView = true;
    start();
  }
}

function initFaqHover() {
  var list = document.querySelector("[data-hover-open]");
  if (!list || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  var items = Array.prototype.slice.call(list.querySelectorAll("[data-accordion-item]"));
  var openTimer = null;
  var leaveTimer = null;

  items.forEach(function (item, index) {
    item.addEventListener("mouseenter", function () {
      clearTimeout(leaveTimer);
      clearTimeout(openTimer);
      openTimer = setTimeout(function () {
        setAccordionItemOpen(item, true);
        // Solo cierro las de abajo: achicar las de arriba movería la pregunta bajo el cursor
        items.forEach(function (other, otherIndex) {
          if (otherIndex > index) setAccordionItemOpen(other, false);
        });
      }, 140);
    });
  });

  list.addEventListener("mouseleave", function () {
    clearTimeout(openTimer);
    leaveTimer = setTimeout(function () {
      items.forEach(function (item) {
        setAccordionItemOpen(item, false);
      });
    }, 350);
  });
}

function initEcosystem() {
  var eco = document.querySelector("[data-eco]");
  if (!eco) return;

  var nodes = eco.querySelectorAll(".eco-node");
  var activity = eco.querySelector("[data-eco-activity]");
  if (!nodes.length || !activity) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var metrics = {};
  eco.querySelectorAll("[data-eco-metric]").forEach(function (el) {
    metrics[el.getAttribute("data-eco-metric")] = {
      el: el,
      value: parseInt(el.textContent.replace(/[^0-9]/g, ""), 10) || 0,
      money: el.textContent.indexOf("$") !== -1
    };
  });

  function format(metric, value) {
    var text = String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, EN ? "," : ".");
    return metric.money ? "$ " + text : text;
  }

  function bump(name, amount) {
    var metric = metrics[name];
    if (!metric) return;
    var from = metric.value;
    var to = from + amount;
    metric.value = to;
    var start = null;
    metric.el.classList.add("is-bump");
    function frame(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / 700, 1);
      metric.el.textContent = format(metric, from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(frame);
      else metric.el.classList.remove("is-bump");
    }
    requestAnimationFrame(frame);
  }

  var current = 0;
  var timer = null;

  function step() {
    nodes[current].classList.remove("is-active");
    current = (current + 1) % nodes.length;
    var node = nodes[current];
    node.classList.add("is-active");

    // data-effect="pedidos:1,cobrado:1890" → suben los números del panel
    (node.getAttribute("data-effect") || "").split(",").forEach(function (pair) {
      var bits = pair.split(":");
      if (bits.length === 2) bump(bits[0].trim(), parseInt(bits[1], 10) || 0);
    });

    var text = node.getAttribute("data-event");
    if (!text) return;
    var prev = activity.querySelector(".is-new");
    if (prev) prev.classList.remove("is-new");
    var li = document.createElement("li");
    li.className = "is-new";
    li.textContent = text;
    activity.insertBefore(li, activity.firstChild);
    while (activity.children.length > 3) {
      activity.removeChild(activity.lastChild);
    }
  }

  function start() {
    if (!timer) timer = setInterval(step, 2600);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  // Solo anima mientras está en pantalla
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) start();
      else stop();
    }).observe(eco);
  } else {
    start();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", handleSubmit);
  }

  var sendAnother = document.getElementById("send-another-msg");
  if (sendAnother) {
    sendAnother.addEventListener("click", showFormFields);
  }

  initThemeToggle();
  initNavbarScroll();
  initHeroMesh();
  initAccordions();
  initEcosystem();
  initCounters();
  initReels();
  initFaqHover();

  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        // Aparece una sola vez: antes se volvía a esconder al salir y el contenido "parpadeaba" al subir y bajar
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        });
      },
      // threshold 0 + margen: con 0.18, un bloque más alto que ~5 pantallas nunca llegaba al umbral y quedaba invisible
      { threshold: 0, rootMargin: "0px 0px -12% 0px" }
    );

    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("in-view");
    });
  }
});
