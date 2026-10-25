/* Rased demo — rased.sa header and footer for the marketing pages. */
(function () {
  'use strict';
  var R = document.documentElement.getAttribute('data-root') || './';
  var home = R;

  var header =
    '<header class="mk-header">' +
      '<a class="logo" href="' + home + '"><img src="' + R + 'assets/img/logo.png" alt="Rased"></a>' +
      '<nav class="mk-nav">' +
        '<a href="' + home + '">Home</a><a href="' + home + '#features">Features</a><a href="' + home + '#solutions">Solutions</a>' +
        '<a href="' + home + '#numbers">Rased Numbers</a><a href="' + home + '#faq">FAQ</a><a href="' + home + '#partners">Success Parteners</a>' +
        '<a href="' + home + '#pricing">Pricing</a><a href="' + home + '#terms" class="caret">Terms</a><a href="' + R + 'demo-request/">Contact Us</a>' +
      '</nav>' +
      '<span class="lang-pill"><b>文A</b>العربية</span>' +
    '</header>';

  var footer =
    '<footer class="mk-footer" id="solutions">' +
      '<div class="fcols">' +
        '<div><h4>Resources</h4><a href="#">Blog</a><a href="#">Success Stories</a><a href="#">Video Library</a><a href="#">Product Tours</a></div>' +
        '<div><h4>Pricing</h4><a href="' + R + 'demo-request/" style="text-decoration:underline">Get Started</a><a href="' + R + 'demo-request/">Request Pricing</a>' +
          '<h4 class="sub">Company</h4><a href="#">About Us</a><a href="' + R + 'demo-request/">Contact Us</a><a href="#">Become a Partner</a></div>' +
        '<div><h4>Solutions</h4><a href="#">Tracking</a><a href="#">Operations Management</a><a href="#">Expense Management</a><a href="#">Maintenance Management</a><a href="#">Developer API</a></div>' +
        '<div><h4 style="margin-top:26px">Licensed By</h4><div class="licensed"><span>TGA</span><span>CST</span></div>' +
          '<h4>Follow Us</h4><div class="social" style="margin-top:22px"><span>YouTube</span><span>X</span><span>in</span><span>IG</span></div></div>' +
      '</div>' +
      '<div class="legal"><span>Tax Registration Number: 300075658510003, Commercial Registration Number: 7001398960<br>© 2026 All rights reserved.</span>' +
        '<span>Terms ( <u>Fleet Management</u> - <u>Fuel Stations</u> ) &nbsp;&nbsp; Privacy &nbsp;&nbsp; Cookies</span></div>' +
    '</footer>';

  function mount() {
    var h = document.getElementById('mk-header'), f = document.getElementById('mk-footer');
    if (h) h.outerHTML = header;
    if (f) f.outerHTML = footer;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
