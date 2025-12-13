document.addEventListener("DOMContentLoaded", () => {
    const deck = document.getElementById("deck");
    const slides = Array.from(document.querySelectorAll(".slide"));
    const counter = document.getElementById("counter");
    const topbarSub = document.getElementById("topbarSub");
    const topbar = document.getElementById("topbar");

    function setTopbar(idx) {
        const t = slides[idx]?.dataset?.title || "";
        if (topbarSub) topbarSub.textContent = t;
    }

    deck.addEventListener("scroll", () => {
        if (!topbar) return;
        topbar.classList.toggle("compact", deck.scrollTop > 10);
    });

    // semua link nav yang menuju #s1, #s2, dst
    const navLinks = Array.from(document.querySelectorAll('.bottom-nav a[href^="#"]'));

    function setActiveById(id) {
        navLinks.forEach(a => {
            const href = a.getAttribute("href");
            a.classList.toggle("active", href === "#" + id);
        });
    }

    function updateCounter(idx) {
        if (!counter) return;
        counter.textContent = `${idx + 1} / ${slides.length}`;
    }

    const obs = new IntersectionObserver((entries) => {
        // ambil yang paling terlihat
        const visible = entries
            .filter(e => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;

        const idx = slides.indexOf(visible.target);
        setTopbar(idx);
        if (idx < 0) return;

        updateCounter(idx);
        setActiveById(visible.target.id);
    }, { root: deck, threshold: [0.55, 0.6, 0.7] });

    slides.forEach(s => obs.observe(s));

    // klik nav: biar scroll masuk ke deck container (bukan window)
    navLinks.forEach(a => {
        a.addEventListener("click", (e) => {
            const id = a.getAttribute("href").slice(1);
            const target = document.getElementById(id);
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    // init state
    updateCounter(0);
    setActiveById(slides[0]?.id || "s1");
});
