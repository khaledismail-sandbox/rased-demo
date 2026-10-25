/* Rased demo — account data, per-user state and the MyFleet-style app shell (login + platform pages).
   Who the user is comes from seeded-users.json (via RasedAnalytics); what the UI shows and how the booking
   behaves comes from the user's ACCOUNT. */
(function () {
  'use strict';
  var html = document.documentElement;
  var ROOT = html.getAttribute('data-root') || './';
  var A = window.RasedAnalytics;

  var SERVICES = {
    oil_change: { label: 'Oil change', price: 450 },
    tyre_replacement: { label: 'Tyre replacement', price: 2400 },
    brake_service: { label: 'Brake service', price: 1350 },
    periodic_inspection: { label: 'Periodic inspection', price: 650 },
    battery_replacement: { label: 'Battery replacement', price: 950 },
    ac_service: { label: 'AC service', price: 780 }
  };

  // UI data per account (vehicles, workshops, KPI numbers). Name, fleet size, region and city come from the data file.
  var ACCOUNT_UI = {
    ramla_contracting: {
      initials: 'RC', alerts: 9, dueService: 27,
      workshops: ['Al-Faisaliyah Fleet Centre, Dammam', 'Dammam 2nd Industrial City Workshop'],
      vehicles: [
        { id: 'RC-118', plate: '4821 ABD', model: 'Mercedes Actros tipper' },
        { id: 'RC-126', plate: '7350 BKR', model: 'Volvo FMX tipper' },
        { id: 'RC-131', plate: '2964 DHN', model: 'Isuzu NPR crew truck' },
        { id: 'RC-144', plate: '5108 HRS', model: 'Toyota Hilux pickup' },
        { id: 'RC-152', plate: '8817 KSD', model: 'Hino 500 water tanker' },
        { id: 'RC-167', plate: '3472 LMR', model: 'Toyota Hilux pickup' }
      ]
    },
    wahat_logistics: {
      initials: 'WL', alerts: 3, dueService: 8,
      workshops: ['Al-Sulay Fleet Centre, Riyadh', 'Riyadh 2nd Industrial City Workshop'],
      vehicles: [
        { id: 'WL-204', plate: '6120 RYD', model: 'Isuzu NQR box van' },
        { id: 'WL-211', plate: '1938 TBK', model: 'Hyundai H100 van' },
        { id: 'WL-219', plate: '4475 NJR', model: 'Mitsubishi Canter reefer' },
        { id: 'WL-226', plate: '9063 SAD', model: 'Hyundai H100 van' },
        { id: 'WL-233', plate: '2716 QSM', model: 'Toyota Hiace cargo' },
        { id: 'WL-241', plate: '5584 ZLF', model: 'Isuzu NPR box van' }
      ]
    }
  };
  var CHOICES = ['ramla_contracting-u001', 'wahat_logistics-u001'];

  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function clearUserState() { ['rased_persona', 'rased_draft', 'rased_last_order'].forEach(function (k) { ls(k, null); }); }

  // Owner-checked JSON records: anything owned by another persona is deleted, never shown.
  function getOwned(key) {
    var uid = A && A.persona(), rec;
    try { rec = JSON.parse(ls(key) || 'null'); } catch (e) { rec = null; }
    if (!rec) return null;
    if (rec.owner !== uid) { ls(key, null); return null; }
    return rec;
  }
  function setOwned(key, obj) { obj.owner = A.persona(); ls(key, JSON.stringify(obj)); }

  // The signed-in user's view: identity from the data file, UI and behaviour from the account.
  // dropper account -> no odometer feed (booking always fails); converter account -> live odometer (booking succeeds).
  function persona() {
    var prof = A && A.profile && A.profile(), ui = prof && ACCOUNT_UI[prof.account.slug];
    if (!prof || !ui) return null;
    return { userId: prof.userId, accountSlug: prof.account.slug, account: prof.account.props.account_name,
      fleet: prof.account.props.fleet_size, region: prof.region, city: prof.city, behaviour: prof.behaviour,
      odometer: prof.behaviour === 'converter', initials: ui.initials, alerts: ui.alerts, dueService: ui.dueService,
      workshops: ui.workshops, vehicles: ui.vehicles };
  }
  // Run page code once the signed-in user's profile is known (never runs without one).
  function whenReady(fn) {
    if (!A || !A.ready) return;
    A.ready.then(function () { if (persona()) fn(); }).catch(function (e) { console.error('[RasedAnalytics] page script failed', e); });
  }
  function choice() { var c = ls('rased_persona_choice'); return CHOICES.indexOf(c) !== -1 ? c : CHOICES[0]; }
  function sar(n) { return 'SAR ' + Number(n).toLocaleString('en-US'); }

  var I = {
    dash: '<path d="M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 13h7v8H3z"/>',
    track: '<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>',
    ops: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>',
    fuel: '<path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17M3 22h12M6 8h6M15 10h2a2 2 0 0 1 2 2v5a2 2 0 0 0 4 0V8l-3-3"/>',
    maint: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    rental: '<path d="M5 17h14M6 17l1.5-6h9L18 17M7 17v3M17 17v3"/><circle cx="8.5" cy="14" r=".6"/><circle cx="15.5" cy="14" r=".6"/><path d="M9 11V7h6v4"/>',
    alert: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
    report: '<path d="M3 3v18h18"/><path d="M7 15v-4M12 15V7M17 15v-6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    truck: '<path d="M1 4h14v12H1zM15 9h4l3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/>'
  };
  function icon(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + I[name] + '</svg>'; }

  var NAV = [
    ['dashboard', 'Dashboard', 'platform/dashboard/', 'dash'],
    ['tracking', 'Tracking', 'platform/live-map/', 'track'],
    ['operations', 'Operations Management', 'platform/operations/', 'ops'],
    ['expenses', 'Expense Management', 'platform/fuel/', 'fuel'],
    ['maintenance', 'Maintenance Management', 'platform/maintenance/', 'maint'],
    ['rental', 'Rental', 'platform/rental/', 'rental'],
    ['alerts', 'Alerts', 'platform/alerts/', 'alert'],
    ['reports', 'Reports', 'platform/reports/', 'report']
  ];

  function toggleHtml() {
    var c = choice();
    return '<span class="ptoggle"><button type="button" data-p="ramla_contracting-u001" title="dropper"' + (c === 'ramla_contracting-u001' ? ' class="on"' : '') + '>d</button>' +
      '<button type="button" data-p="wahat_logistics-u001" title="converter"' + (c === 'wahat_logistics-u001' ? ' class="on"' : '') + '>c</button></span>';
  }
  // The tiny d/c toggle only switches the prefilled sign-in ID; it never signs anyone out.
  function bindToggle(scope) {
    scope.querySelectorAll('.ptoggle button').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-p');
        ls('rased_persona_choice', id);
        scope.querySelectorAll('.ptoggle button').forEach(function (x) { x.classList.toggle('on', x === b); });
        var input = document.getElementById('uid');
        if (input) { input.value = id; var err = document.getElementById('err'); if (err) err.hidden = true; }
      });
    });
  }

  // Wrap the page's <main data-title=…> in the app shell.
  function shell() {
    var main = document.querySelector('main[data-module]');
    if (!main) return;
    var p = persona(); if (!p) return;
    var mod = main.getAttribute('data-module');
    var nav = NAV.map(function (n) {
      return '<a href="' + ROOT + n[2] + '"' + (n[0] === mod ? ' class="on"' : '') + '>' + icon(n[3]) + '<span>' + n[1] + '</span></a>';
    }).join('');
    var app = document.createElement('div');
    app.className = 'app';
    app.innerHTML =
      '<aside class="side"><div class="rail"><span>' + icon('gear') + '</span><span class="on">' + icon('dash') + '</span></div>' +
      '<div class="drawer"><a class="brand" href="' + ROOT + 'platform/dashboard/"><img src="' + ROOT + 'assets/img/logo.png" alt="Rased"></a>' +
      '<nav>' + nav + '</nav>' +
      '<div class="who">' + p.account + ' · ' + p.userId + '<br><a href="#" id="signout">Sign out</a></div></div></aside>' +
      '<div class="main"><header class="topbar"><span class="burger"></span><h1>' + main.getAttribute('data-title') + '</h1><span class="sp"></span>' +
      '<span class="lang-pill" style="font-size:13px;padding:5px 14px">العربية</span>' +
      '<span class="acct"><i>' + p.initials + '</i>' + p.account + '</span></header></div>';
    var right = app.querySelector('.main');
    main.classList.add('content');
    right.appendChild(main);
    var foot = document.createElement('footer');
    foot.className = 'app-foot';
    foot.innerHTML = '<span>Provided by Elm · Rased Fleet Management · © 2026</span>' + toggleHtml();
    right.appendChild(foot);
    document.body.insertBefore(app, document.body.firstChild);
    bindToggle(foot);
    app.querySelector('#signout').addEventListener('click', function (e) {
      e.preventDefault(); clearUserState(); location.href = ROOT + 'login/';
    });
  }

  window.Rased = {
    ROOT: ROOT, SERVICES: SERVICES, ACCOUNT_UI: ACCOUNT_UI, persona: persona, choice: choice, sar: sar, icon: icon,
    getOwned: getOwned, setOwned: setOwned, clear: function (k) { ls(k, null); }, whenReady: whenReady,
    toggleHtml: toggleHtml, bindToggle: bindToggle, clearUserState: clearUserState,
    hex8: function () { var a = new Uint8Array(4); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('').toUpperCase(); }
  };

  if (html.getAttribute('data-page') === 'platform') {
    var start = function () { whenReady(shell); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
})();
