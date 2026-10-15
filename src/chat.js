// NorwinLabs guided chat assistant.
// A scripted conversation (no AI, no tracking) that collects a lead and sends it
// to the team by email through Web3Forms. If no access key is configured, or the
// request fails, it falls back to a prefilled email the visitor can send.
(function () {
  "use strict";
  if (!document.body || document.body.dataset.chat === "off") return;

  // Public Web3Forms access key (safe to expose; it only lets people email you).
  // Get a free one at https://web3forms.com by entering norwinlabs@gmail.com.
  var ACCESS_KEY = "d75fe6d5-b49a-4d3c-81ac-a21d0eeaddee";
  var TO_EMAIL = "norwinlabs@gmail.com";
  var ENDPOINT = "https://api.web3forms.com/submit";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var store = {
    get: function (k) {
      try { return window.sessionStorage.getItem(k); } catch (e) { return null; }
    },
    set: function (k, v) {
      try { window.sessionStorage.setItem(k, v); } catch (e) { /* storage unavailable */ }
    },
  };

  var SERVICES = [
    { id: "inventory", label: "NorwinInventory (software)", q: "Are you looking for a demo, pricing details, or help getting set up?", opts: ["Try the demo", "Pricing details", "Help getting set up"] },
    { id: "msp", label: "Managed IT services (MSP)", q: "Roughly how many computers or users would we support?", opts: ["1-10", "11-25", "26-50", "50+"] },
    { id: "network", label: "Computer networking", q: "Is this a new network, or fixing an existing one?", opts: ["New setup", "Fix an existing network", "Upgrade or expand"] },
    { id: "cabling", label: "Server room and cable cleanup", q: "What are we tidying up?", opts: ["One rack or closet", "Multiple racks", "A whole server room", "Not sure yet"] },
    { id: "website", label: "Website building", q: "What kind of website do you need?", opts: ["New website", "Redesign", "Fixes or updates", "Not sure yet"] },
    { id: "pcbuild", label: "Custom PC building", q: "What will the PC mainly be used for?", opts: ["Gaming", "Creative work", "Office or business", "Development or workstation"] },
    { id: "repair", label: "PC troubleshooting", q: "What is going on with the computer?", opts: ["Slow or freezing", "Will not start", "Crashes or blue screens", "Virus or pop-ups", "Something else"] },
    { id: "acq", label: "Tech review for a business acquisition", q: "What kind of business are you looking at, and roughly how many employees does it have?", text: true },
    { id: "other", label: "Something else", q: "Tell me a bit about what you need.", text: true },
  ];

  var FAQ = [
    { q: "Pricing", a: "NorwinInventory is $75 per month with unlimited items, teammates and scanners. Consulting starts at $90 for troubleshooting, $200 plus parts for a custom PC, $300 for networking, $900 for an acquisition tech review and $1,200 for a website. Managed IT is custom monthly plans, and cable cleanup starts with a free walkthrough. Every project gets a clear estimate first." },
    { q: "Where do you work?", a: "Remotely, and on-site in our local area. Ask for on-site availability and we will confirm." },
    { q: "Support hours", a: "NorwinInventory customers get 24/7 customer support by email at " + TO_EMAIL + "." },
    { q: "Website support", a: "Every website we build includes lifetime support: free fixes for issues in our work, plus security and compatibility updates. Content changes and new features are quoted separately." },
  ];

  var state = { lead: {}, busy: false, sent: store.get("nl-chat-sent") === "1", started: false };

  // ---------- DOM ----------
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var root = el("div", "cb");
  var launcher = el("button", "cb-launcher");
  launcher.type = "button";
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", "cb-panel");
  launcher.setAttribute("aria-label", "Open chat");
  var avatar = el("img", "cb-launcher-img");
  avatar.src = "/media/logo-96.webp";
  avatar.alt = "";
  avatar.width = 36;
  avatar.height = 36;
  var closeIcon = el("span", "cb-launcher-x", "×");
  closeIcon.setAttribute("aria-hidden", "true");
  launcher.appendChild(avatar);
  launcher.appendChild(closeIcon);

  var teaser = el("div", "cb-teaser");
  teaser.hidden = true;
  var teaserBtn = el("button", "cb-teaser-open", "Need IT help? Chat with us");
  teaserBtn.type = "button";
  var teaserX = el("button", "cb-teaser-x", "×");
  teaserX.type = "button";
  teaserX.setAttribute("aria-label", "Dismiss");
  teaser.appendChild(teaserBtn);
  teaser.appendChild(teaserX);

  var panel = el("section", "cb-panel");
  panel.id = "cb-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Chat with NorwinLabs");

  var head = el("header", "cb-head");
  var headImg = el("img", "cb-head-img");
  headImg.src = "/media/logo-96.webp";
  headImg.alt = "";
  headImg.width = 32;
  headImg.height = 32;
  var headText = el("div", "cb-head-text");
  headText.appendChild(el("strong", "", "NorwinLabs"));
  headText.appendChild(el("span", "", "Ask a question or request a quote"));
  var closeBtn = el("button", "cb-close", "×");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close chat");
  head.appendChild(headImg);
  head.appendChild(headText);
  head.appendChild(closeBtn);

  var log = el("div", "cb-log");
  log.setAttribute("role", "log");
  log.setAttribute("aria-live", "polite");
  var choices = el("div", "cb-choices");

  var form = el("form", "cb-input");
  form.hidden = true;
  form.noValidate = true;
  var input = el("input", "cb-field");
  input.type = "text";
  input.autocomplete = "off";
  input.setAttribute("aria-label", "Your reply");
  var sendBtn = el("button", "cb-send", "Send");
  sendBtn.type = "submit";
  form.appendChild(input);
  form.appendChild(sendBtn);

  var note = el("p", "cb-note", "We only use what you share to reply to you.");

  panel.appendChild(head);
  panel.appendChild(log);
  panel.appendChild(choices);
  panel.appendChild(form);
  panel.appendChild(note);
  root.appendChild(teaser);
  root.appendChild(panel);
  root.appendChild(launcher);
  document.body.appendChild(root);

  // ---------- helpers ----------
  function scrollDown() {
    log.scrollTop = log.scrollHeight;
  }
  function userSays(text) {
    var m = el("div", "cb-msg cb-user", text);
    log.appendChild(m);
    scrollDown();
  }
  function botSays(text, cb, extra) {
    var typing = el("div", "cb-msg cb-bot cb-typing");
    typing.setAttribute("aria-hidden", "true");
    typing.appendChild(el("i"));
    typing.appendChild(el("i"));
    typing.appendChild(el("i"));
    log.appendChild(typing);
    scrollDown();
    var wait = reduceMotion ? 0 : Math.min(300 + text.length * 8, 900);
    window.setTimeout(function () {
      typing.remove();
      var m = el("div", "cb-msg cb-bot");
      m.textContent = text;
      if (extra) m.appendChild(extra);
      log.appendChild(m);
      scrollDown();
      if (cb) cb();
    }, wait);
  }
  function clearInputs() {
    choices.textContent = "";
    form.hidden = true;
    input.value = "";
    input.type = "text";
    input.removeAttribute("aria-invalid");
  }
  function showChoices(opts, onPick) {
    clearInputs();
    opts.forEach(function (o) {
      var label = typeof o === "string" ? o : o.label;
      var b = el("button", "cb-chip" + (o.primary ? " primary" : ""), label);
      b.type = "button";
      b.addEventListener("click", function () {
        clearInputs();
        userSays(label);
        onPick(o);
      });
      choices.appendChild(b);
    });
    var first = choices.querySelector("button");
    if (first && !panel.hidden) first.focus({ preventScroll: true });
  }
  function askText(opts, onSubmit) {
    clearInputs();
    input.type = opts.type || "text";
    input.placeholder = opts.placeholder || "Type here";
    input.autocomplete = opts.autocomplete || "off";
    input.setAttribute("aria-label", opts.label || "Your reply");
    form.hidden = false;
    var skip = null;
    if (opts.skip) {
      skip = el("button", "cb-chip", opts.skip);
      skip.type = "button";
      skip.addEventListener("click", function () {
        clearInputs();
        userSays(opts.skip);
        onSubmit("");
      });
      choices.appendChild(skip);
    }
    form.onsubmit = function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!v) {
        if (opts.skip) return;
        input.setAttribute("aria-invalid", "true");
        return;
      }
      if (opts.validate && !opts.validate(v)) {
        input.setAttribute("aria-invalid", "true");
        botSays(opts.error || "Please check that and try again.");
        return;
      }
      clearInputs();
      userSays(v);
      onSubmit(v);
    };
    if (!panel.hidden) input.focus({ preventScroll: true });
  }

  // ---------- conversation ----------
  function start() {
    state.started = true;
    state.lead = {};
    log.textContent = "";
    botSays("Hi! I'm the NorwinLabs assistant. I can answer quick questions or collect a few details so we can send you a quote.", function () {
      mainMenu();
    });
  }

  function mainMenu() {
    showChoices(
      [
        { label: "Get a quote or consultation", primary: true, go: "lead" },
        { label: "I have a question", go: "faq" },
      ],
      function (o) {
        if (o.go === "lead") leadService();
        else faqMenu();
      }
    );
  }

  function faqMenu() {
    botSays("Sure. What would you like to know?", function () {
      var opts = FAQ.map(function (f) { return { label: f.q, faq: f }; });
      opts.push({ label: "Get a quote instead", primary: true, go: "lead" });
      showChoices(opts, function (o) {
        if (o.go === "lead") return leadService();
        botSays(o.faq.a, function () {
          showChoices(
            [
              { label: "Ask something else", go: "faq" },
              { label: "Get a quote or consultation", primary: true, go: "lead" },
            ],
            function (n) {
              if (n.go === "lead") leadService();
              else faqMenu();
            }
          );
        });
      });
    });
  }

  function leadService() {
    botSays("Great. What do you need help with?", function () {
      showChoices(SERVICES.map(function (s) { return { label: s.label, svc: s }; }), function (o) {
        state.lead.service = o.svc.label;
        serviceQuestion(o.svc);
      });
    });
  }

  function serviceQuestion(svc) {
    botSays(svc.q, function () {
      var done = function (answer) {
        state.lead.detail = answer;
        askArea();
      };
      if (svc.text) {
        askText({ placeholder: "Type your answer", label: svc.q }, done);
      } else {
        showChoices(svc.opts, function (o) { done(typeof o === "string" ? o : o.label); });
      }
    });
  }

  function askArea() {
    botSays("Would you like this done remotely or on-site?", function () {
      showChoices(["Remote is fine", "On-site (local area)", "Not sure yet"], function (o) {
        state.lead.location = o;
        askTimeline();
      });
    });
  }

  function askTimeline() {
    botSays("How soon are you hoping to get started?", function () {
      showChoices(["As soon as possible", "Within a month", "Just exploring"], function (o) {
        state.lead.timeline = o;
        askNotes();
      });
    });
  }

  function askNotes() {
    botSays("Anything else we should know? You can skip this.", function () {
      askText({ placeholder: "Extra details (optional)", label: "Extra details", skip: "Skip" }, function (v) {
        state.lead.notes = v;
        askName();
      });
    });
  }

  function askName() {
    botSays("Almost done. What's your name?", function () {
      askText({ placeholder: "Your name", label: "Your name", autocomplete: "name" }, function (v) {
        state.lead.name = v;
        askEmail();
      });
    });
  }

  function askEmail() {
    botSays("Thanks, " + state.lead.name.split(" ")[0] + "! What email should we reply to?", function () {
      askText(
        {
          type: "email",
          placeholder: "you@example.com",
          label: "Your email",
          autocomplete: "email",
          validate: function (v) { return /^\S+@\S+\.\S+$/.test(v); },
          error: "That email does not look right. Could you check it?",
        },
        function (v) {
          state.lead.email = v;
          askPhone();
        }
      );
    });
  }

  function askPhone() {
    botSays("And a phone number, if you would like a call? You can skip this.", function () {
      askText({ type: "tel", placeholder: "Phone (optional)", label: "Your phone number", autocomplete: "tel", skip: "Skip" }, function (v) {
        state.lead.phone = v;
        showSummary();
      });
    });
  }

  function summaryLines() {
    var l = state.lead;
    return [
      ["Service", l.service],
      ["Details", l.detail],
      ["Location", l.location],
      ["Timeline", l.timeline],
      ["Notes", l.notes || "None"],
      ["Name", l.name],
      ["Email", l.email],
      ["Phone", l.phone || "Not provided"],
    ];
  }

  function showSummary() {
    var card = el("dl", "cb-summary");
    summaryLines().forEach(function (row) {
      card.appendChild(el("dt", "", row[0]));
      card.appendChild(el("dd", "", row[1]));
    });
    botSays("Here is what I will send to the team:", function () {
      showChoices(
        [
          { label: "Send to NorwinLabs", primary: true, go: "send" },
          { label: "Start over", go: "restart" },
        ],
        function (o) {
          if (o.go === "restart") return start();
          send();
        }
      );
    }, card);
  }

  function messageText() {
    return summaryLines()
      .map(function (r) { return r[0] + ": " + r[1]; })
      .join("\n");
  }

  function fallback() {
    var subject = "Quote request: " + state.lead.service;
    var body = messageText() + "\n\nSent from the website chat.";
    var mailto = "mailto:" + TO_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    var gmail = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(TO_EMAIL) + "&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    var wrap = el("div", "cb-links");
    var a1 = el("a", "cb-chip primary", "Open in my email app");
    a1.href = mailto;
    var a2 = el("a", "cb-chip", "Compose in Gmail");
    a2.href = gmail;
    a2.target = "_blank";
    a2.rel = "noopener";
    wrap.appendChild(a1);
    wrap.appendChild(a2);
    botSays("I could not send that automatically. You can send it yourself in one click, or email " + TO_EMAIL + " directly.", null, wrap);
  }

  function send() {
    if (state.busy) return;
    if (state.sent) {
      botSays("Your request is already on its way. If anything has changed, email " + TO_EMAIL + ".");
      return;
    }
    if (!ACCESS_KEY) {
      fallback();
      return;
    }
    state.busy = true;
    var l = state.lead;
    var payload = {
      access_key: ACCESS_KEY,
      subject: "New website lead: " + l.service + " - " + l.name,
      from_name: "NorwinLabs website chat",
      name: l.name,
      email: l.email,
      replyto: l.email,
      phone: l.phone || "",
      service: l.service,
      details: l.detail,
      location: l.location,
      timeline: l.timeline,
      notes: l.notes || "",
      page: window.location.href,
      message: messageText(),
      botcheck: "",
    };
    botSays("Sending...", function () {
      var ctl = typeof AbortController === "function" ? new AbortController() : null;
      var timer = ctl ? window.setTimeout(function () { ctl.abort(); }, 15000) : null;
      window
        .fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
          signal: ctl ? ctl.signal : undefined,
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (timer) window.clearTimeout(timer);
          state.busy = false;
          if (data && data.success) {
            state.sent = true;
            store.set("nl-chat-sent", "1");
            botSays("Thank you, " + l.name.split(" ")[0] + "! Your request has been sent. We will reply to " + l.email + " soon.", function () {
              showChoices([{ label: "Ask another question", go: "faq" }], function () { faqMenu(); });
            });
          } else {
            fallback();
          }
        })
        .catch(function () {
          if (timer) window.clearTimeout(timer);
          state.busy = false;
          fallback();
        });
    });
  }

  // ---------- open / close ----------
  function setOpen(open) {
    panel.hidden = !open;
    root.classList.toggle("open", open);
    launcher.setAttribute("aria-expanded", String(open));
    launcher.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    teaser.hidden = true;
    if (open) {
      store.set("nl-chat-teased", "1");
      if (!state.started) start();
      else {
        var f = choices.querySelector("button") || (!form.hidden ? input : null);
        if (f) f.focus({ preventScroll: true });
      }
    } else {
      launcher.focus({ preventScroll: true });
    }
  }
  launcher.addEventListener("click", function () { setOpen(panel.hidden); });
  closeBtn.addEventListener("click", function () { setOpen(false); });
  teaserBtn.addEventListener("click", function () { setOpen(true); });
  teaserX.addEventListener("click", function () {
    teaser.hidden = true;
    store.set("nl-chat-teased", "1");
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) setOpen(false);
  });

  // One gentle nudge per visit
  if (!store.get("nl-chat-teased")) {
    window.setTimeout(function () {
      if (panel.hidden) teaser.hidden = false;
    }, 9000);
  }
})();
