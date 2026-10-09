/**
 * Dashboard shell — shared behaviour across every role's layout.
 * Sidebar collapse/expand, mobile drawer, profile dropdown, and the
 * initial loading screen fade-out.
 */
(function () {
  var loadingScreen = document.getElementById('loading-screen');
  window.addEventListener('load', function () {
    if (loadingScreen) {
      setTimeout(function () { loadingScreen.classList.add('hidden'); }, 150);
    }
  });

  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  var sidebarToggle = document.getElementById('sidebarToggle');
  var mobileMenuToggle = document.getElementById('mobileMenuToggle');

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function () {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed') ? '1' : '0');
    });
  }

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', function () {
      sidebar.classList.add('mobile-open');
      overlay.classList.add('visible');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', function () {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('visible');
    });
  }

  var profileTrigger = document.getElementById('profileTrigger');
  var profileDropdown = document.getElementById('profileDropdown');
  var notificationTrigger = document.getElementById('notificationTrigger');
  var notificationDropdown = document.getElementById('notificationDropdown');

  function closeAllDropdowns(except) {
    [profileDropdown, notificationDropdown].forEach(function (d) {
      if (d && d !== except) d.classList.remove('open');
    });
  }

  if (profileTrigger && profileDropdown) {
    profileTrigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var wasOpen = profileDropdown.classList.contains('open');
      closeAllDropdowns();
      if (!wasOpen) profileDropdown.classList.add('open');
    });
  }

  if (notificationTrigger && notificationDropdown) {
    notificationTrigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var wasOpen = notificationDropdown.classList.contains('open');
      closeAllDropdowns();
      if (!wasOpen) notificationDropdown.classList.add('open');
    });
  }

  document.addEventListener('click', function (e) {
    if (profileDropdown && !profileDropdown.contains(e.target) && e.target !== profileTrigger && !profileTrigger?.contains(e.target)) {
      profileDropdown.classList.remove('open');
    }
    if (notificationDropdown && !notificationDropdown.contains(e.target) && e.target !== notificationTrigger && !notificationTrigger?.contains(e.target)) {
      notificationDropdown.classList.remove('open');
    }
  });

  // Restore sidebar collapse preference (desktop only)
  if (sidebar && localStorage.getItem('sidebarCollapsed') === '1' && window.innerWidth > 992) {
    sidebar.classList.add('collapsed');
  }
})();

/**
 * Reusable SweetAlert2 confirm helper for destructive / significant
 * actions (approve, reject, suspend, reset password). Submits the
 * given form only after the user confirms.
 */
function confirmAction(formEl, options) {
  options = options || {};
  if (typeof Swal === 'undefined') {
    if (window.confirm(options.text || 'Are you sure?')) formEl.submit();
    return;
  }
  Swal.fire({
    title: options.title || 'Are you sure?',
    text: options.text || 'This action cannot be undone.',
    icon: options.icon || 'warning',
    showCancelButton: true,
    confirmButtonText: options.confirmText || 'Yes, continue',
    cancelButtonText: 'Cancel',
    confirmButtonColor: options.danger ? '#a13d3d' : '#7a1f3d',
    cancelButtonColor: '#756e68',
    reverseButtons: true,
  }).then(function (result) {
    if (result.isConfirmed) formEl.submit();
  });
}
