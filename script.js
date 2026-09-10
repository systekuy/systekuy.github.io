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
    hint.textContent = "No mandamos spam. Usamos tus datos solo para responderte.";
    hint.style.color = "";
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
    hint.textContent = "Enviando mensaje...";
    hint.style.color = "";
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
        hint.textContent = "Error al enviar. Intenta de nuevo más tarde.";
        hint.style.color = "#fca5a5";
      }
    })
    .finally(function () {
      if (submitBtn) submitBtn.disabled = false;
    });

  return false;
}

function initNavbarScroll() {
  var nav = document.querySelector(".nav");
  if (!nav) return;

  function updateNav() {
    if (window.scrollY > 24) {
      nav.classList.add("is-scrolled");
    } else {
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

  function resize() {
    var rect = hero.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function mousePushAt(x, y) {
    var dx = x - mouse.x;
    var dy = y - mouse.y;
    return Math.exp(-(dx * dx + dy * dy) / 26000) * 38;
  }

  function drawFrame() {
    t += 0.008;
    ctx.clearRect(0, 0, width, height);

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
      ctx.strokeStyle = "rgba(125, 211, 252, " + alpha + ")";
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
      ctx.strokeStyle = "rgba(167, 139, 250, " + vAlpha + ")";
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

    if (!reduceMotion) {
      requestAnimationFrame(drawFrame);
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

  window.addEventListener("resize", function () {
    resize();
    if (reduceMotion) drawFrame();
  });

  hero.addEventListener("mousemove", onPointerMove, { passive: true });
  hero.addEventListener("touchmove", onPointerMove, { passive: true });
  hero.addEventListener("mouseleave", onPointerLeave);
  hero.addEventListener("touchend", onPointerLeave);
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

  initNavbarScroll();
  initHeroWaves();

  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          } else {
            entry.target.classList.remove("in-view");
          }
        });
      },
      { threshold: 0.18 }
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
