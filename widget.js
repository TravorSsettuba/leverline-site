/* Dealer financing button.
   Usage on a dealer's listing page:
   <script src="https://YOUR-DOMAIN.com/widget.js" data-dealer="acme-equipment" data-amount="45000" data-item="2019 Cat 259D"></script>
   Renders a "Finance from $X/mo" button that opens the application with the dealer and price attached. */
(function () {
  var s = document.currentScript;
  if (!s) return;
  var base = s.src.replace(/\/widget\.js.*$/, "");
  var dealer = s.getAttribute("data-dealer") || "";
  var amount = Number(s.getAttribute("data-amount")) || 0;
  var item = s.getAttribute("data-item") || "";
  var label = s.getAttribute("data-label");

  if (!label) {
    if (amount > 0) {
      var r = 9.5 / 100 / 12, n = 60; // illustrative rate/term for the teaser only
      var mo = amount * r / (1 - Math.pow(1 + r, -n));
      label = "Finance from $" + Math.round(mo).toLocaleString("en-US") + "/mo";
    } else {
      label = "Apply for financing";
    }
  }

  var url = base + "/apply.html?dealer=" + encodeURIComponent(dealer) +
    (amount ? "&amount=" + amount : "") + (item ? "&item=" + encodeURIComponent(item) : "");

  var wrap = document.createElement("span");
  wrap.style.cssText = "display:inline-block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;text-align:center";
  var a = document.createElement("a");
  a.href = url; a.target = "_blank"; a.rel = "noopener";
  a.textContent = label;
  a.style.cssText = "display:inline-block;background:#e8a013;color:#2a1c00;font-weight:800;padding:12px 20px;border-radius:10px;text-decoration:none;font-size:16px;line-height:1.2";
  var note = document.createElement("span");
  note.textContent = "Estimate only. Subject to credit approval.";
  note.style.cssText = "display:block;font-size:11px;color:#667;margin-top:4px";
  wrap.appendChild(a); wrap.appendChild(note);
  s.parentNode.insertBefore(wrap, s);
})();
