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

function initHeroWaves() {
  var canvas = document.getElementById("hero-waves");
  var hero = document.querySelector(".hero");
  if (!canvas || !hero) return;

  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var width = 0;
  var height = 0;
  var mouse = { x: -9999, y: -9999 };
  var hLines = 28;
  var vLines = 36;
  var hPoints = 52;
  var vPoints = 40;
  var t = 0;

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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function mousePushAt(x, y) {
    var dx = x - mouse.x;
    var dy = y - mouse.y;
    return Math.exp(-(dx * dx + dy * dy) / 26000) * 38;
  }

  var visible = true;
  var rafId = null;

  function drawFrame() {
    rafId = null;
    t += 0.008;
    ctx.clearRect(0, 0, width, height);
    var light = isLight();

    var glow = ctx.createRadialGradient(
      width * 0.7,
      height * 0.2,
      20,
      width * 0.55,
      height * 0.45,
      Math.max(width, height) * 0.7
    );
    glow.addColorStop(0, "rgba(59, 130, 246, 0.16)");
    glow.addColorStop(0.45, "rgba(139, 92, 246, 0.08)");
    glow.addColorStop(1, "rgba(7, 17, 31, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Horizontal lines
    for (var i = 0; i < hLines; i++) {
      var baseY = (height / (hLines - 1)) * i;
      var alpha = 0.1 + (i / hLines) * 0.26;
      ctx.beginPath();
      ctx.strokeStyle = (light ? "rgba(37, 99, 235, " : "rgba(125, 211, 252, ") + alpha + ")";
      ctx.lineWidth = 1.05;

      for (var j = 0; j < hPoints; j++) {
        var x = (width / (hPoints - 1)) * j;
        var wave =
          Math.sin(j * 0.18 + t * 1.4 + i * 0.22) * 9 +
          Math.sin(j * 0.07 - t * 0.9 + i * 0.4) * 5 +
          Math.sin(j * 0.31 + t * 0.55) * 3;
        var y = baseY + wave + mousePushAt(x, baseY);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Vertical lines (same reactive behavior)
    for (var vi = 0; vi < vLines; vi++) {
      var baseX = (width / (vLines - 1)) * vi;
      var vAlpha = 0.08 + (vi / vLines) * 0.2;
      ctx.beginPath();
      ctx.strokeStyle = (light ? "rgba(124, 58, 237, " : "rgba(167, 139, 250, ") + vAlpha + ")";
      ctx.lineWidth = 1;

      for (var vj = 0; vj < vPoints; vj++) {
        var y2 = (height / (vPoints - 1)) * vj;
        var waveX =
          Math.sin(vj * 0.16 + t * 1.25 + vi * 0.2) * 8 +
          Math.sin(vj * 0.08 - t * 0.85 + vi * 0.35) * 5 +
          Math.sin(vj * 0.28 + t * 0.5) * 2.5;
        var x2 = baseX + waveX + mousePushAt(baseX, y2) * 0.85;
        if (vj === 0) ctx.moveTo(x2, y2);
        else ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }

    // Difuminado de abajo dentro del canvas (antes era mask-image en CSS, caro en Safari/iOS con un canvas animado)
    var fadeTop = height * 0.72;
    var fade = ctx.createLinearGradient(0, fadeTop, 0, height);
    fade.addColorStop(0, "rgba(0, 0, 0, 0)");
    fade.addColorStop(1, "rgba(0, 0, 0, 1)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = fade;
    ctx.fillRect(0, fadeTop, width, height - fadeTop);
    ctx.globalCompositeOperation = "source-over";

    if (!reduceMotion && visible) {
      rafId = requestAnimationFrame(drawFrame);
    }
  }

  function onPointerMove(event) {
    var rect = hero.getBoundingClientRect();
    var clientX = event.touches ? event.touches[0].clientX : event.clientX;
    var clientY = event.touches ? event.touches[0].clientY : event.clientY;
    mouse.x = clientX - rect.left;
    mouse.y = clientY - rect.top;
  }

  function onPointerLeave() {
    mouse.x = -9999;
    mouse.y = -9999;
  }

  resize();
  drawFrame();

  // Pausa cuando el hero sale de pantalla
  if (!reduceMotion && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && rafId === null) rafId = requestAnimationFrame(drawFrame);
    }).observe(hero);
  }

  window.addEventListener("resize", function () {
    if (resize() && reduceMotion) drawFrame();
  });

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
  initHeroWaves();
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
