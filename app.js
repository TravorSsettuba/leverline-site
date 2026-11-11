(function () {
  var S = window.SITE || {};
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var money = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); };
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Brand + contact placeholders
  $$("[data-brand]").forEach(function (el) { el.textContent = S.brand || "Leverline"; });
  $$("[data-email]").forEach(function (el) {
    el.textContent = S.contactEmail || "";
    if (el.tagName === "A") el.href = "mailto:" + (S.contactEmail || "");
  });
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  function payment(principal, aprPct, months) {
    var r = aprPct / 100 / 12;
    return principal * r / (1 - Math.pow(1 + r, -months));
  }

  // ---------- Motion: nav, scroll bar, reveals, glow, marquee, rotator ----------
  var navEl = $("header.nav"), bar = $("#scrollbar");
  var onScroll = function () {
    var y = window.scrollY || 0;
    if (navEl) navEl.classList.toggle("scrolled", y > 20);
    if (bar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? Math.min(100, y / max * 100) : 0) + "%";
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var reveals = $$("[data-reveal]");
  if (reduced || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) {
      // Stagger siblings that reveal together
      var sibs = $$(":scope > [data-reveal]", el.parentNode);
      var i = sibs.indexOf(el);
      if (i > 0) el.style.transitionDelay = (i * 0.11) + "s";
      io.observe(el);
    });
  }

  $$(".glow").forEach(function (card) {
    card.addEventListener("mousemove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  // Duplicate marquee content so the loop is seamless
  $$(".marquee .track").forEach(function (track) {
    $$(":scope > *", track).forEach(function (child) {
      var c = child.cloneNode(true);
      c.setAttribute("aria-hidden", "true");
      track.appendChild(c);
    });
  });

  // Rotating headline word
  $$("[data-rotate]").forEach(function (el) {
    var words = el.getAttribute("data-rotate").split("|"), i = 0;
    var span = document.createElement("span");
    span.textContent = words[0];
    el.textContent = ""; el.appendChild(span);
    if (reduced || words.length < 2) return;
    setInterval(function () {
      span.className = "out";
      setTimeout(function () {
        i = (i + 1) % words.length;
        span.textContent = words[i];
        span.className = "in";
      }, 350);
    }, 2600);
  });

  // ---------- Payment estimator (animated numbers) ----------
  var est = $("#estimator");
  if (est) {
    var range = $("#est-amount"), out = $("#est-amount-out"), result = $("#est-result"), cta = $("#est-cta"), box = $(".est-out", est);
    var term = S.defaultTermMonths || 60;
    var shown = { lo: 0, hi: 0 }, raf = null;
    var paint = function () { result.textContent = money(shown.lo) + " – " + money(shown.hi) + "/mo"; };
    var render = function (animate) {
      var amt = Number(range.value);
      out.textContent = money(amt);
      range.style.setProperty("--fill", ((amt - range.min) / (range.max - range.min) * 100) + "%");
      cta.href = "apply.html?amount=" + amt + "&term=" + term;
      var lo = payment(amt, S.aprLow || 8.5, term), hi = payment(amt, S.aprHigh || 18, term);
      if (raf) cancelAnimationFrame(raf);
      if (!animate || reduced) { shown.lo = lo; shown.hi = hi; paint(); return; }
      var from = { lo: shown.lo, hi: shown.hi }, start = null, dur = 450;
      var tick = function (t) {
        if (start === null) start = t;
        var p = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - p, 3);
        shown.lo = from.lo + (lo - from.lo) * e; shown.hi = from.hi + (hi - from.hi) * e;
        paint();
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    range.addEventListener("input", function () { render(true); });
    $$(".seg button", est).forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".seg button", est).forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        term = Number(b.dataset.term);
        box.classList.remove("bump"); void box.offsetWidth; box.classList.add("bump");
        render(true);
      });
    });
    render(true); // count up from zero on load
  }

  // ---------- Forms (apply + dealer signup) ----------
  function qs(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
  }

  function validate(scope) {
    var ok = true;
    $$("[required]", scope).forEach(function (f) {
      var bad = f.type === "checkbox" ? !f.checked : !f.value.trim();
      if (!bad && f.type === "email") bad = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value);
      if (!bad && f.type === "tel") bad = f.value.replace(/\D/g, "").length < 10;
      if (!bad && f.type === "number") bad = Number(f.value) < Number(f.min || 0);
      if (f.type === "checkbox") {
        var err = f.closest("label").nextElementSibling;
        if (err && err.classList.contains("err")) err.style.display = bad ? "block" : "none";
      } else {
        f.classList.remove("invalid");
        if (bad) { void f.offsetWidth; f.classList.add("invalid"); }
      }
      if (bad) ok = false;
    });
    if (!ok) { var first = $(".invalid", scope); if (first) first.focus(); }
    return ok;
  }

  $$("form[data-lead-form]").forEach(function (form) {
    var field = function (n) { return form.querySelector('[name="' + n + '"]'); };
    // Prefill from URL (the dealer widget passes dealer + amount + item)
    ["dealer", "amount", "term", "item"].forEach(function (k) {
      var v = qs(k), f = field(k);
      if (v && f) f.value = v;
    });
    var dealer = qs("dealer"), banner = $("#dealer-banner");
    if (dealer && banner) {
      banner.hidden = false;
      $("#dealer-name").textContent = dealer.replace(/-/g, " ");
    }
    if (!S.formEndpoint) { var demo = $("#demo-notice"); if (demo) demo.hidden = false; }

    // Clear error state as the user fixes a field
    form.addEventListener("input", function (e) { if (e.target.classList) e.target.classList.remove("invalid"); });

    // Multi-step panels
    var panels = $$(".step-panel", form), marks = $$(".steps-bar div"), cur = 0;
    var go = function (n, back) {
      cur = n;
      panels.forEach(function (p, i) {
        p.classList.toggle("active", i === n);
        p.classList.toggle("back", !!back);
      });
      marks.forEach(function (m, i) {
        m.classList.toggle("on", i === n);
        m.classList.toggle("done", i < n);
      });
    };
    if (panels.length) {
      go(0);
      $$("[data-next]", form).forEach(function (b) {
        b.addEventListener("click", function () { if (validate(panels[cur])) go(cur + 1); });
      });
      $$("[data-back]", form).forEach(function (b) {
        b.addEventListener("click", function () { go(cur - 1, true); });
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (panels.length) {
        // Enter key on an earlier step advances instead of submitting
        if (cur < panels.length - 1) { if (validate(panels[cur])) go(cur + 1); return; }
        for (var i = 0; i < panels.length; i++) {
          if ($$("[required]", panels[i]).some(function (f) { return f.type === "checkbox" ? !f.checked : !f.value.trim(); })) {
            go(i, i < cur); validate(panels[i]); return;
          }
        }
      }
      if (!validate(form)) return;

      var data = { type: form.dataset.leadForm, submittedAt: new Date().toISOString(), page: location.href };
      $$("input, select, textarea", form).forEach(function (f) {
        if (!f.name) return;
        data[f.name] = f.type === "checkbox" ? f.checked : f.value.trim();
      });

      var btn = $("button[type=submit]", form), label = btn.textContent;
      btn.disabled = true; btn.textContent = "Sending…";
      var done = function () {
        form.hidden = true;
        var bar = $(".steps-bar"); if (bar) bar.hidden = true;
        var s = $("#success"); s.hidden = false; s.scrollIntoView({ behavior: "smooth", block: "center" });
      };
      var fail = function () {
        btn.disabled = false; btn.textContent = label;
        var f = $("#send-fail"); if (f) f.hidden = false;
      };

      if (!S.formEndpoint) {
        // Demo mode: keep a local copy only. Nothing leaves the browser.
        try {
          var all = JSON.parse(localStorage.getItem("leverline_demo_leads") || "[]");
          all.push(data); localStorage.setItem("leverline_demo_leads", JSON.stringify(all));
        } catch (err) { /* ignore */ }
        // Never tell a visitor we'll be in touch when nothing was delivered.
        var box = $("#success");
        $("h3", box).textContent = "Demo only: nothing was sent";
        $("p", box).textContent = "This site is not accepting requests yet. Your details were not sent to anyone and stay only in this browser.";
        done();
        return;
      }
      if (/script\.google\.com/.test(S.formEndpoint)) {
        // Google Apps Script can't answer a CORS preflight, so send a simple
        // text/plain POST. The response is opaque; a network error still rejects.
        fetch(S.formEndpoint, { method: "POST", mode: "no-cors", body: JSON.stringify(data) }).then(done).catch(fail);
        return;
      }
      fetch(S.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      }).then(function (r) { if (!r.ok) throw new Error(r.status); done(); }).catch(fail);
    });
  });

  // ---------- Dealer embed snippet generator ----------
  var gen = $("#snippet-gen");
  if (gen) {
    var nameIn = $("#snip-name"), priceIn = $("#snip-price"), outPre = $("#snip-out"), prev = $("#snip-preview");
    var slug = function (s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "your-dealership"; };
    var draw = function () {
      var id = slug(nameIn.value), price = Math.max(1000, Number(priceIn.value) || 45000);
      var base = (S.domain || "").replace(/\/$/, "");
      outPre.textContent = '<script src="' + base + '/widget.js" data-dealer="' + id + '" data-amount="' + price + '"><\/script>';
      prev.firstChild.textContent = "Finance from " + money(payment(price, 9.5, 60)) + "/mo ";
      prev.href = "apply.html?dealer=" + id + "&amount=" + price;
    };
    nameIn.addEventListener("input", draw); priceIn.addEventListener("input", draw);
    $("#snip-copy").addEventListener("click", function () {
      var b = this;
      navigator.clipboard.writeText(outPre.textContent).then(function () {
        b.textContent = "Copied ✓"; setTimeout(function () { b.textContent = "Copy code"; }, 1500);
      });
    });
    draw();
  }
})();
