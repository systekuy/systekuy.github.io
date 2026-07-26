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
    hint.textContent = "No enviamos spam. Usaremos tus datos solo para responder a tu consulta.";
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

  // Validación HTML nativa (porque usamos novalidate para controlar el flujo)
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
