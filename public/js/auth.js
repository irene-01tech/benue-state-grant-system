/**
 * Auth pages — shared client-side behaviour.
 * Password visibility toggles and instant confirm-password matching.
 * All real validation happens on the server; this is UX sugar only.
 */
(function () {
  document.querySelectorAll('.password-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.getAttribute('data-toggle-for');
      var input = document.getElementById(targetId);
      if (!input) return;
      var isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
      btn.classList.toggle('is-active', isHidden);
    });
  });

  var pw = document.getElementById('password');
  var confirm = document.getElementById('confirmPassword');
  var matchError = document.getElementById('matchError');

  function checkMatch() {
    if (!pw || !confirm) return;
    if (!confirm.value) {
      if (matchError) matchError.style.display = 'none';
      confirm.style.borderColor = '';
      return;
    }
    var matches = pw.value === confirm.value;
    if (matchError) matchError.style.display = matches ? 'none' : 'block';
    confirm.style.borderColor = matches ? '' : 'var(--color-danger)';
  }

  if (pw && confirm) {
    pw.addEventListener('input', checkMatch);
    confirm.addEventListener('input', checkMatch);
  }

  // Auto-uppercase-first + basic LGA select niceties could go here later.
})();
