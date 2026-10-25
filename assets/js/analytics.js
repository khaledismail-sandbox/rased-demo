/* Rased demo — the ONE analytics wrapper. Nothing else calls amplitude.track directly.
   Loaded in <head> right after the unified loader so init happens before the loader's own auto-init.
   Identities come from assets/data/seeded-users.json (the profiles already stored in Amplitude).
   Real sending happens only on the published host; anywhere else (localhost) it is RECORDER-ONLY: the Amplitude
   scripts are not loaded (see the <head> loader) and every would-be call is written to the localStorage recorder. */
(function () {
  'use strict';
  var KEY = 'ad85aaa13604f0cb6816af5141d8b190';
  var COUNTRY = 'Saudi Arabia';
  var MASK_LEVEL = 'light';
  var LIVE = location.hostname === 'khaledismail-sandbox.github.io';

  var html = document.documentElement;
  var PAGE = html.getAttribute('data-page');            // marketing | login | platform
  var ROOT = html.getAttribute('data-root') || './';     // relative path to the site root
  var amp = LIVE ? window.amplitude : null;   // loader stub at first; the real SDK is merged into the same object when it loads
  var SDK_WAIT_MS = 5000;

  function warn(msg, err) { try { console.error('[RasedAnalytics] ' + msg, err || ''); } catch (e) {} }

  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }

  function deviceIdFor(uid) {
    var k = 'rased_device_' + uid, d = ls(k);
    if (!d) { d = crypto.randomUUID(); ls(k, d); }
    return d;
  }

  // ---- seeded users: user -> {set, setOnce, account}; account -> {persona, region, city, props} ----
  var DATA = null;
  var userId = ls('rased_persona');   // known synchronously; its profile arrives with the data file
  var P = null;                        // resolved profile of the signed-in user
  var dataSettled = false;

  function profileFor(uid) {
    var u = DATA && DATA.users && DATA.users[uid];
    var a = u && DATA.accounts && DATA.accounts[u.account];
    if (!u || !a) return null;
    return { userId: uid, region: a.region, city: a.city, behaviour: a.persona, set: u.set, setOnce: u.setOnce,
      account: { slug: u.account, props: a.props } };
  }

  var readyP = fetch(ROOT + 'assets/data/seeded-users.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) { DATA = d; }, function (e) { warn('could not load seeded users — sign-in and identify are unavailable', e); })
    .then(function () {
      if (userId) { P = profileFor(userId); if (!P) userId = null; }
      dataSettled = true;
      return P;
    });

  // ---- recorder: always on when not sending; opt-in (rased_rec = '1') on the live site ----
  function ids() {
    if (P) return { user_id: P.userId, device_id: deviceIdFor(P.userId) };
    if (PAGE === 'marketing') return { user_id: null, device_id: deviceIdFor('marketing') };
    return { user_id: null, device_id: null };
  }
  function rec(type, name, props, options, queued) {
    if (LIVE && ls('rased_rec') !== '1') return;
    var log; try { log = JSON.parse(ls('rased_rec_log') || '[]'); } catch (e) { log = []; }
    var i = ids();
    var e = { t: new Date().toISOString(), type: type, name: name, props: props || {}, options: options || {},
      path: location.pathname, user_id: i.user_id, device_id: i.device_id, sent: LIVE };
    if (queued) e.queued = true;
    log.push(e);
    ls('rased_rec_log', JSON.stringify(log));
  }

  function baseOptions() {
    var o = { country: COUNTRY };
    if (P) { o.region = P.region; o.city = P.city; }
    return o;
  }
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in (b || {})) o[k] = b[k]; return o; }

  // ---- state ----
  var active = false;      // this page is meant to send events
  var ready = false;       // identity sent; queue may flush
  var queue = [];
  var hideHooks = [];
  var status = { initialised: false, sdkLoaded: false, srAdded: false, engagementAdded: false, account: null };
  var identityResolve;
  var identityP = new Promise(function (r) { identityResolve = r; });   // true once identity is sent, false if it never can be

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function send(name, props, opts) {
    if (!LIVE) return Promise.resolve();
    try {
      var r = amp.track(name, props, opts);
      return (r && r.promise) ? r.promise : Promise.resolve();
    } catch (e) { warn('track failed: ' + name, e); return Promise.resolve(); }
  }

  function track(name, props, options) {
    // A signed-in user's region/city come from the data file: wait for it so every event carries them.
    if (userId && !dataSettled) return readyP.then(function () { return track(name, props, options); });
    props = props || {};
    var opts = merge(baseOptions(), options);
    rec('track', name, props, opts, !ready);
    if (ready) return send(name, props, opts);
    return new Promise(function (res) { queue.push(function () { send(name, props, opts).then(res, res); }); });
  }

  // Track, then navigate once it is sent (max 800 ms after sending). If identity is still pending we wait for it
  // first (bounded by the SDK wait), so the event is never stranded in the page's queue by the navigation.
  function trackThenGo(name, props, href, options) {
    var done = false;
    function go() { if (!done) { done = true; location.href = href; } }
    var sent = track(name, props, options);
    identityP.then(function (ok) {
      if (!ok) return go();
      Promise.race([sent, sleep(800)]).then(go, go);
    });
    setTimeout(go, SDK_WAIT_MS + 1500);   // hard cap: navigation always happens
  }

  function flush() {
    var optedOut = 'n/a (recorder-only)';
    if (LIVE) { try { optedOut = amp.getOptOut ? amp.getOptOut() : null; } catch (e) { optedOut = null; } }
    rec('flush', 'identity sent; releasing ' + queue.length + ' queued track(s)', { sdk_opt_out: optedOut });
    if (optedOut === true) warn('SDK is opted out on a page that should send events');
    ready = true; var q = queue; queue = []; q.forEach(function (fn) { fn(); });
    identityResolve(true);
  }

  // ---- identity ----
  function personaIdentity() {
    try {
      var opts = { country: COUNTRY, region: P.region, city: P.city }, k;
      rec('identify', '$identify', { $set: P.set, $setOnce: P.setOnce }, opts);
      rec('identify', '$setGroup', { account: P.account.slug }, opts);
      rec('identify', '$groupidentify', { group_type: 'account', group_name: P.account.slug, $set: P.account.props }, opts);
      status.account = P.account.slug;
      if (!LIVE) return;
      var id = new window.amplitude.Identify();
      for (k in P.set) id.set(k, P.set[k]);
      for (k in P.setOnce) id.setOnce(k, P.setOnce[k]);
      amp.identify(id, opts);
      amp.setGroup('account', P.account.slug, opts);
      var g = new window.amplitude.Identify();
      for (k in P.account.props) g.set(k, P.account.props[k]);
      amp.groupIdentify('account', P.account.slug, g, opts);
    } catch (e) { warn('persona identify failed', e); }
  }

  function anonymousIdentity() {
    try {
      var q = new URLSearchParams(location.search);
      var src = q.get('utm_source'), med = q.get('utm_medium'), cmp = q.get('utm_campaign');
      var anyUtm = src || med || cmp;
      // Internal navigation (same host) is not a referrer.
      var ref = 'EMPTY', refDomain = 'EMPTY';
      if (document.referrer) {
        try { var u = new URL(document.referrer); if (u.hostname && u.hostname !== location.hostname) { ref = document.referrer; refDomain = u.hostname; } } catch (e) {}
      }
      var w = window.innerWidth;
      var set = {
        utm_source: anyUtm ? (src || 'EMPTY') : 'EMPTY',
        utm_medium: anyUtm ? (med || 'EMPTY') : 'direct',
        utm_campaign: anyUtm ? (cmp || 'EMPTY') : 'EMPTY',
        referrer: ref, referring_domain: refDomain,
        device_type: w < 768 ? 'mobile' : (w < 1024 ? 'tablet' : 'desktop'),
        language: 'en'
      };
      var once = { initial_utm_source: set.utm_source, initial_utm_medium: set.utm_medium, initial_utm_campaign: set.utm_campaign,
        initial_referrer: ref, initial_referring_domain: refDomain };
      var opts = { country: COUNTRY }, k;
      rec('identify', '$identify', { $set: set, $setOnce: once }, opts);
      if (!LIVE) return;
      var id = new window.amplitude.Identify();
      for (k in set) id.set(k, set[k]);
      for (k in once) id.setOnce(k, once[k]);
      amp.identify(id, opts);
    } catch (e) { warn('anonymous identify failed', e); }
  }

  function pageViewed() {
    track('[Amplitude] Page Viewed', {
      '[Amplitude] Page Domain': location.hostname,
      '[Amplitude] Page Location': location.href,
      '[Amplitude] Page Path': location.pathname,
      '[Amplitude] Page Title': document.title,
      '[Amplitude] Page URL': location.origin + location.pathname
    });
  }

  // ---- SDK readiness: the loader stub must be replaced by the real SDK before identify/track ----
  function sdkLoaded() {
    var a = window.amplitude;
    return !!(a && a.Identify && typeof a.runQueuedFunctions === 'function');
  }
  function waitForSdk() {
    return new Promise(function (res) {
      if (sdkLoaded()) return res(true);
      var t0 = Date.now();
      var iv = setInterval(function () {
        if (sdkLoaded()) { clearInterval(iv); res(true); }
        else if (Date.now() - t0 >= SDK_WAIT_MS) { clearInterval(iv); res(false); }
      }, 50);
    });
  }

  // init is queued on the loader stub immediately (so the loader never auto-inits), then we wait for the real SDK.
  // optOut is ALWAYS passed explicitly: the SDK otherwise inherits the opt-out saved in its cookie by the login page.
  function init(uid, optOut) {
    if (!LIVE) { status.initialised = true; return Promise.resolve(true); }   // recorder-only: nothing to load
    function doInit() {
      // Anonymous pages use their own named instance with localStorage identity: the default instance shares the
      // identity cookie, which carries the last user's ID and would merge anonymous traffic into that user.
      amp = uid === '' ? window.amplitude.createInstance('rased-marketing') : window.amplitude;
      if (window.sessionReplay) {
        amp.add(window.sessionReplay.plugin({ sampleRate: 1, privacyConfig: { defaultMaskLevel: MASK_LEVEL } }));
        status.srAdded = true;
      }
      if (window.engagement) { amp.add(window.engagement.plugin()); status.engagementAdded = true; }
      // SDK-generated events (Rage/Dead Click, Guides & Surveys) get the same location as wrapper events.
      amp.add({ name: 'rased-location', type: 'enrichment', setup: function () { return Promise.resolve(); },
        execute: function (e) {
          var o = baseOptions();
          for (var k in o) if (!e[k]) e[k] = o[k];
          return Promise.resolve(e);
        } });
      var opts = {
        fetchRemoteConfig: true,
        optOut: !!optOut,
        autocapture: { attribution: false, pageViews: false, sessions: false, formInteractions: false,
          fileDownloads: false, elementInteractions: false, frustrationInteractions: true }
      };
      if (uid) opts.deviceId = deviceIdFor(uid);
      else if (uid === '') { opts.deviceId = deviceIdFor('marketing'); opts.identityStorage = 'localStorage'; }
      var r = amp.init(KEY, uid || undefined, opts);
      // On the loader stub, init's promise resolves with the real SDK's {promise} when the call is replayed — wait for that too.
      var p = (r && r.promise) ? r.promise : Promise.resolve();
      return p.then(function (v) { return (v && v.promise) ? v.promise : v; });
    }
    var initP = null;
    try { if (window.amplitude) initP = doInit(); } catch (e) { warn('init failed', e); }
    return waitForSdk().then(function (ok) {
      status.sdkLoaded = ok;
      if (!ok) { warn('Amplitude SDK not loaded after ' + SDK_WAIT_MS + ' ms (blocked or offline) — no events will be sent on this page'); return false; }
      try { if (!initP) initP = doInit(); } catch (e) { warn('init failed', e); return false; }
      var settled = false;
      return Promise.race([initP.then(function () { settled = true; return true; }, function (e) { settled = true; warn('init rejected', e); return true; }),
        sleep(SDK_WAIT_MS).then(function () { if (!settled) warn('init did not settle after ' + SDK_WAIT_MS + ' ms'); return true; })]);
    }).then(function (ok) {
      status.initialised = ok;
      if (!ok) identityResolve(false);
      return ok;
    }, function (e) { warn('startup failed', e); identityResolve(false); return false; });
  }

  function loginPath() { return ROOT + 'login/'; }
  function clearUserState() { ['rased_persona', 'rased_draft', 'rased_last_order'].forEach(function (k) { ls(k, null); }); }

  var sdkP;
  try {
    if (PAGE === 'platform' && !userId) {
      // No signed-in user: never send anything, just go to sign-in.
      init(null, true);
      location.replace(loginPath());
    } else if (PAGE === 'login') {
      sdkP = init(null, true);          // opted out until a valid user signs in
    } else if (PAGE === 'platform' || (PAGE === 'marketing' && userId)) {
      active = true;
      var sdkReady = init(userId, false);
      pageViewed();
      readyP.then(function () {
        if (!P) {   // stored ID is not in the seeded users: drop it without sending anything
          warn('signed-in user is not in seeded-users.json — signing out');
          clearUserState(); active = false; identityResolve(false);
          if (PAGE === 'platform') location.replace(loginPath());
          return;
        }
        sdkReady.then(function (ok) { if (ok) { personaIdentity(); flush(); } });
      });
    } else if (PAGE === 'marketing') {
      active = true;
      pageViewed();
      init('', false).then(function (ok) {
        if (!ok) return;
        if (LIVE) {
          try {
            if (amp.getUserId()) { warn('anonymous page still had a user ID after init — clearing it'); amp.setUserId(undefined); amp.setSessionId(Date.now()); }
            if (amp.getDeviceId() !== deviceIdFor('marketing')) amp.setDeviceId(deviceIdFor('marketing'));
          } catch (e) { warn('anonymous reset failed', e); }
        }
        anonymousIdentity(); flush();
      });
    }
  } catch (e) { warn('startup failed', e); identityResolve(false); }

  // Sign in (login page only). Resolves false — sending nothing — for any ID not in seeded-users.json.
  function signIn(uid, href) {
    return readyP.then(function () {
      var prof = profileFor(uid);
      if (!prof) return false;
      ls('rased_persona', uid);
      userId = uid; P = prof;
      active = true;
      pageViewed();
      trackThenGo('User Logged In', { login_method: 'password', is_first_login: false }, href);
      (sdkP || Promise.resolve(false)).then(function (ok) {
        if (!ok) return;
        if (LIVE) {
          try {
            amp.setOptOut(false);
            amp.setDeviceId(deviceIdFor(uid));
            amp.setUserId(uid);
            amp.setSessionId(Date.now());
          } catch (e) { warn('sign-in identity setup failed', e); }
        }
        personaIdentity();
        flush();
      });
      return true;
    });
  }

  // ---- pagehide: page hooks (e.g. abandonment) then Session Ended, all via beacon ----
  window.addEventListener('pagehide', function () {
    if (!active || !ready) return;
    if (LIVE) { try { amp.setTransport('beacon'); } catch (e) {} }
    hideHooks.forEach(function (fn) { try { fn(); } catch (e) {} });
    var opts = baseOptions();
    rec('track', 'Session Ended', {}, opts);
    send('Session Ended', {}, opts);
    if (LIVE) { try { amp.flush(); } catch (e) {} }
  });

  // ---- "LOCAL TEST — not sending" note in the footer when not on the published host ----
  if (!LIVE) {
    // Placed after the data file and page load, so the platform app shell (built once the user is known) exists.
    var loaded = new Promise(function (r) { window.addEventListener('load', r); });
    Promise.all([readyP, loaded]).then(function () { setTimeout(placeNote, 0); });
  }
  function placeNote() {
    try {
      var foot = document.querySelector('.app-foot, .login-foot, .mk-footer .legal');
      var note = document.createElement('span');
      note.className = 'local-note';
      note.textContent = 'LOCAL TEST — not sending';
      note.style.cssText = 'display:inline-block;margin:0 10px;font-size:11px;font-weight:700;letter-spacing:.5px;color:var(--brand-navy);background:var(--icon-tile);border-radius:10px;padding:2px 8px';
      if (foot) foot.appendChild(note);
      else { note.style.cssText += ';position:fixed;left:8px;bottom:8px;z-index:50'; document.body.appendChild(note); }
    } catch (e) {}
  }

  function sdkCheck() {
    var exp = {};
    ['Experiment', 'webExperiment', 'WebExperiment'].forEach(function (n) { exp[n] = typeof window[n]; });
    var out = {};
    try {
      out = {
        mode: LIVE ? 'live (sending)' : 'recorder-only (not sending)',
        amplitude_present: !!window.amplitude,
        sdk_loaded: status.sdkLoaded,
        amplitude_initialised: status.initialised,
        sending_enabled: LIVE && active && ready,
        sdk_opt_out: amp && amp.getOptOut ? amp.getOptOut() : null,
        Identify_present: !!(window.amplitude && window.amplitude.Identify),
        session_replay_plugin_added: status.srAdded,
        session_replay_mask_level_in_code: MASK_LEVEL,
        engagement_plugin_added: status.engagementAdded,
        experiment_globals: exp,
        user_id: LIVE ? (amp && amp.getUserId ? amp.getUserId() : null) : ids().user_id,
        device_id: LIVE ? (amp && amp.getDeviceId ? amp.getDeviceId() : null) : ids().device_id,
        account_group: status.account
      };
      console.table(out);
    } catch (e) { warn('sdkCheck failed', e); }
    return out;
  }

  window.RasedAnalytics = {
    LIVE: LIVE,
    ready: readyP,                                   // resolves once seeded users are loaded (with the signed-in profile, or null)
    persona: function () { return userId; },
    profile: function () { return P; },
    track: track,
    trackThenGo: trackThenGo,
    signIn: signIn,
    clearUserState: clearUserState,
    onHide: function (fn) { hideHooks.push(fn); },
    sdkCheck: sdkCheck,
    recDump: function () { var l = JSON.parse(ls('rased_rec_log') || '[]'); console.table(l.map(function (e) { return { t: e.t, type: e.type, name: e.name, queued: !!e.queued, path: e.path, user_id: e.user_id, device_id: e.device_id, sent: e.sent, props: JSON.stringify(e.props), options: JSON.stringify(e.options) }; })); return l; },
    recClear: function () { ls('rased_rec_log', '[]'); }
  };
})();
