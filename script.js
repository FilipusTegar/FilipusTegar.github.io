document.addEventListener("DOMContentLoaded", function () {
  // Set current year in footer
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // Animasi slide dari bawah
  const slideElements = document.querySelectorAll(".slide-up");

  const observer = new IntersectionObserver(
    (entries, observerRef) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
          // Supaya tidak animasi ulang
          observerRef.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15
    }
  );

  slideElements.forEach((el) => observer.observe(el));
  
    // Support animasi untuk konten di dalam <details> saat dibuka
  document.querySelectorAll("details").forEach((d) => {
    d.addEventListener("toggle", () => {
      if (!d.open) return;

      d.querySelectorAll(".slide-up:not(.show)").forEach((el) => {
        observer.observe(el);
      });
    });
  });

});
