/* Rased demo — the ONE analytics wrapper. Nothing else calls amplitude.track directly.
   Loaded in <head> right after the unified loader so init happens before the loader's own auto-init. */
(function () {
  'use strict';
  var KEY = 'ad85aaa13604f0cb6816af5141d8b190';
  var COUNTRY = 'Saudi Arabia';
  var MASK_LEVEL = 'light';

  var PERSONAS = {
    'ramla_contracting-u001': {
      region: 'Eastern Province', city: 'Dammam',
      set: { user_role: 'maintenance_coordinator', department: 'maintenance', vehicles_managed: 110,
        linked_vehicle_pct: 21, telematics_linked: false, can_approve_orders: false, is_account_champion: false,
        language: 'ar', onboarding_completed: true, plan_tier: 'Enterprise', contract_value: 1650000,
        renewal_date: '2026-12-17', days_since_invite: 19, device_type: 'tablet', region: 'Eastern Province',
        utm_source: 'newsletter', utm_medium: 'email', utm_campaign: 'customer_newsletter_oct',
        referrer: 'EMPTY', referring_domain: 'EMPTY' },
      setOnce: { initial_utm_source: 'newsletter', initial_utm_medium: 'email',
        initial_utm_campaign: 'customer_newsletter_oct', initial_referrer: 'EMPTY', initial_referring_domain: 'EMPTY' },
      account: { slug: 'ramla_contracting', props: { account_id: 'ACC-1002', account_name: 'Ramla Contracting',
        plan_tier: 'Enterprise', fleet_size: 300, industry_segment: 'construction', region: 'Eastern Province',
        modules_subscribed: ['tracking', 'operations', 'expenses_fuel', 'maintenance', 'rental'],
        renewal_date: '2026-12-17', contract_value: 1650000 } }
    },
    'wahat_logistics-u001': {
      region: 'Riyadh', city: 'Riyadh',
      set: { user_role: 'maintenance_coordinator', department: 'maintenance', vehicles_managed: 45,
        linked_vehicle_pct: 97, telematics_linked: true, can_approve_orders: true, is_account_champion: false,
        language: 'en', onboarding_completed: true, plan_tier: 'Enterprise', contract_value: 1200000,
        renewal_date: '2027-09-24', days_since_invite: 323, device_type: 'desktop', region: 'Riyadh',
        utm_source: 'google', utm_medium: 'organic', utm_campaign: 'organic_search',
        referrer: 'https://www.google.com/', referring_domain: 'www.google.com' },
      setOnce: { initial_utm_source: 'google', initial_utm_medium: 'organic', initial_utm_campaign: 'organic_search',
        initial_referrer: 'https://www.google.com/', initial_referring_domain: 'www.google.com' },
      account: { slug: 'wahat_logistics', props: { account_id: 'ACC-1001', account_name: 'Wahat Logistics',
        plan_tier: 'Enterprise', fleet_size: 180, industry_segment: 'logistics', region: 'Riyadh',
        modules_subscribed: ['tracking', 'operations', 'expenses_fuel', 'maintenance', 'rental'],
        renewal_date: '2027-09-24', contract_value: 1200000 } }
    }
  };

  var html = document.documentElement;
  var PAGE = html.getAttribute('data-page');            // marketing | login | platform
  var ROOT = html.getAttribute('data-root') || './';     // relative path to the site root
  var amp = window.amplitude;

  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }

  var userId = ls('rased_persona');
  var P = PERSONAS[userId] || null;
  if (!P) userId = null;

  function deviceIdFor(uid) {
    var k = 'rased_device_' + uid, d = ls(k);
    if (!d) { d = crypto.randomUUID(); ls(k, d); }
    return d;
  }

  // ---- opt-in recorder (synchronous at call time) ----
  // Tracks issued before identity carry queued:true; a 'flush' entry marks when identity is done and they are sent.
  function rec(type, name, props, options, queued) {
    if (ls('rased_rec') !== '1') return;
    var log; try { log = JSON.parse(ls('rased_rec_log') || '[]'); } catch (e) { log = []; }
    var e = { t: new Date().toISOString(), type: type, name: name, props: props || {}, options: options || {}, path: location.pathname };
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
  var active = false;      // SDK initialised and allowed to send
  var ready = false;       // identity sent; queue may flush
  var queue = [];
  var hideHooks = [];
  var status = { initialised: false, srAdded: false, engagementAdded: false, account: null };

  function send(name, props, opts) {
    var r = amp.track(name, props, opts);
    return (r && r.promise) ? r.promise : Promise.resolve();
  }

  function track(name, props, options) {
    props = props || {};
    var opts = merge(baseOptions(), options);
    rec('track', name, props, opts, !ready);
    if (ready) return send(name, props, opts);
    return new Promise(function (res) { queue.push(function () { send(name, props, opts).then(res, res); }); });
  }

  function trackThenGo(name, props, href, options) {
    var done = false;
    function go() { if (!done) { done = true; location.href = href; } }
    Promise.race([track(name, props, options), new Promise(function (r) { setTimeout(r, 800); })]).then(go, go);
  }

  function flush() { rec('flush', 'identity sent; releasing ' + queue.length + ' queued track(s)'); ready = true; var q = queue; queue = []; q.forEach(function (fn) { fn(); }); }

  // ---- identity ----
  function personaIdentity() {
    var id = new amp.Identify(), k;
    for (k in P.set) id.set(k, P.set[k]);
    for (k in P.setOnce) id.setOnce(k, P.setOnce[k]);
    var opts = { country: COUNTRY, region: P.region, city: P.city };
    rec('identify', '$identify', { $set: P.set, $setOnce: P.setOnce }, opts);
    amp.identify(id, opts);
    amp.setGroup('account', P.account.slug, opts);
    rec('identify', '$setGroup', { account: P.account.slug }, opts);
    var g = new amp.Identify();
    for (k in P.account.props) g.set(k, P.account.props[k]);
    rec('identify', '$groupidentify', { group_type: 'account', group_name: P.account.slug, $set: P.account.props }, opts);
    amp.groupIdentify('account', P.account.slug, g, opts);
    status.account = P.account.slug;
  }

  function anonymousIdentity() {
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
    var id = new amp.Identify(), k;
    for (k in set) id.set(k, set[k]);
    for (k in once) id.setOnce(k, once[k]);
    var opts = { country: COUNTRY };
    rec('identify', '$identify', { $set: set, $setOnce: once }, opts);
    amp.identify(id, opts);
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

  // ---- init (always at load, so the loader never auto-inits) ----
  function init(uid, optOut) {
    if (!amp) return Promise.resolve();
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
      autocapture: { attribution: false, pageViews: false, sessions: false, formInteractions: false,
        fileDownloads: false, elementInteractions: false, frustrationInteractions: true }
    };
    if (uid) opts.deviceId = deviceIdFor(uid);
    if (optOut) opts.optOut = true;
    var r = amp.init(KEY, uid || undefined, opts);
    var p = (r && r.promise) ? r.promise : Promise.resolve();
    return p.then(function () { status.initialised = true; }, function () { status.initialised = true; });
  }

  function loginPath() { return ROOT + 'login/'; }

  if (PAGE === 'platform' && !P) {
    // No persona: never send anything, just go to sign-in.
    init(null, true);
    location.replace(loginPath());
  } else if (PAGE === 'login') {
    init(null, true);          // opted out until a valid persona signs in
  } else if (PAGE === 'platform' || (PAGE === 'marketing' && P)) {
    active = true;
    pageViewed();
    init(userId, false).then(function () { personaIdentity(); flush(); });
  } else if (PAGE === 'marketing') {
    active = true;
    pageViewed();
    init(null, false).then(function () { anonymousIdentity(); flush(); });
  }

  // Sign in (login page only): enable the SDK under the persona, identify, then page view + login.
  function signIn(uid, href) {
    if (!PERSONAS[uid]) return false;
    ls('rased_persona', uid);
    userId = uid; P = PERSONAS[uid];
    amp.setOptOut(false);
    amp.setDeviceId(deviceIdFor(uid));
    amp.setUserId(uid);
    amp.setSessionId(Date.now());
    active = true;
    personaIdentity();
    flush();
    pageViewed();
    trackThenGo('User Logged In', { login_method: 'password', is_first_login: false }, href);
    return true;
  }

  // ---- pagehide: page hooks (e.g. abandonment) then Session Ended, all via beacon ----
  window.addEventListener('pagehide', function () {
    if (!active || !amp) return;
    try { amp.setTransport('beacon'); } catch (e) {}
    hideHooks.forEach(function (fn) { try { fn(); } catch (e) {} });
    var opts = baseOptions();
    rec('track', 'Session Ended', {}, opts);
    if (ready) amp.track('Session Ended', {}, opts);
    try { amp.flush(); } catch (e) {}
  });

  function sdkCheck() {
    var exp = {};
    ['Experiment', 'webExperiment', 'WebExperiment'].forEach(function (n) { exp[n] = typeof window[n]; });
    var out = {
      amplitude_present: !!amp,
      amplitude_initialised: status.initialised,
      sending_enabled: active,
      Identify_present: !!(amp && amp.Identify),
      session_replay_plugin_added: status.srAdded,
      session_replay_mask_level_in_code: MASK_LEVEL,
      engagement_plugin_added: status.engagementAdded,
      experiment_globals: exp,
      user_id: amp && amp.getUserId ? amp.getUserId() : null,
      device_id: amp && amp.getDeviceId ? amp.getDeviceId() : null,
      account_group: status.account
    };
    console.table(out);
    return out;
  }

  window.RasedAnalytics = {
    PERSONAS: PERSONAS,
    persona: function () { return userId; },
    track: track,
    trackThenGo: trackThenGo,
    signIn: signIn,
    onHide: function (fn) { hideHooks.push(fn); },
    sdkCheck: sdkCheck,
    recDump: function () { var l = JSON.parse(ls('rased_rec_log') || '[]'); console.table(l.map(function (e) { return { t: e.t, type: e.type, name: e.name, queued: !!e.queued, path: e.path, props: JSON.stringify(e.props), options: JSON.stringify(e.options) }; })); return l; },
    recClear: function () { ls('rased_rec_log', '[]'); }
  };
})();
