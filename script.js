function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const hint = document.getElementById("form-hint");
  hint.textContent = "Enviando mensaje...";
  hint.style.color = "";

  // update hidden replyto so Formspree will send autorespuesta al usuario
  const emailValue = form.querySelector("input[name=email]")?.value;
  if (emailValue) {
    const replyField = document.getElementById("replytoField");
    if (replyField) replyField.value = emailValue;
  }

  // Enviar usando fetch a la URL indicada en el atributo action del formulario
  fetch(form.action, {
    method: "POST",
    body: new FormData(form),
    headers: {
      Accept: "application/json"
    }
  })
    .then((response) => {
      if (response.ok) {
        hint.textContent = "Mensaje enviado correctamente";
        hint.style.color = "#bbf7d0";
        form.reset();
      } else {
        return response.json().then((data) => {
          const err = (data && data.error) ? data.error : "Error al enviar el formulario";
          throw new Error(err);
        });
      }
    })
    .catch((err) => {
      console.error("Error al enviar formulario:", err);
      hint.textContent = "Error al enviar. Intenta de nuevo más tarde.";
      hint.style.color = "#fca5a5";
    });
}
  
document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          } else {
            entry.target.classList.remove("in-view");
          }
        });
      },
      { threshold: 0.18 }
    );

    revealEls.forEach((el) => observer.observe(el));
  } else {
    // Fallback sin observer: mostrar todo
    revealEls.forEach((el) => el.classList.add("in-view"));
  }
});