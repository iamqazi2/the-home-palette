/* ==========================================================================
   Advance payment gate — consent handling.

   The figures in snippets/hp-advance-notice.liquid are rendered by Liquid and
   recompute on their own, because Shopify re-renders the cart sections after
   every cart change. All this file does is hold the checkout button until the
   consent box is ticked.

   Three deliberate choices:

   - Everything is delegated from `document`. On the cart page the checkout
     button lives in main-cart-footer while the form it submits lives in
     main-cart-items, so there is no single element containing both; and the
     cart sections are replaced wholesale on every quantity change, which would
     throw away listeners bound to them. Delegation sidesteps both.

   - The button is never given the `disabled` property. It already carries a
     Liquid `disabled` for the empty cart, and toggling the property from here
     would fight that. More to the point, a disabled button drops out of the tab
     order and announces nothing, so a keyboard user meets a dead control with
     no explanation. Instead it gets aria-disabled and a click interceptor, and
     the reason is spoken by a live region.

   - Submission is caught on the form as well as the button, in the capture
     phase, so Enter-in-a-quantity-field is covered too. A notice records which
     form it guards in data-form-id.

   This is a courtesy gate, not enforcement. Dynamic wallet buttons (Shop Pay
   and friends) render in cross-origin iframes and cannot be intercepted, and
   /checkout can be reached directly. The order is only actually held by the
   server-side rule that nothing dispatches until the advance is recorded.
   ========================================================================== */

(function () {
  var BLOCK = '[data-hp-advance]';
  var BUTTONS = '[name="checkout"], .cart__checkout-button';
  /* Cart page and cart drawer each render their own copy of the notice. */
  var SCOPES = 'cart-drawer, #main-cart-footer';

  function isBlocked(block) {
    if (!block || block.dataset.applies !== 'true') return false;
    if (block.dataset.requireConsent !== 'true') return false;

    var consent = block.querySelector('[data-hp-advance-consent]');
    return !!consent && !consent.checked;
  }

  function setError(block, visible) {
    if (!block) return;
    var error = block.querySelector('[data-hp-advance-error]');
    if (error) error.hidden = !visible;
    block.classList.toggle('hp-advance--flagged', visible);
  }

  function hold(event, block) {
    if (!isBlocked(block)) return;

    event.preventDefault();
    event.stopPropagation();
    setError(block, true);

    var consent = block.querySelector('[data-hp-advance-consent]');
    if (consent) consent.focus();
  }

  function sync() {
    document.querySelectorAll(SCOPES).forEach(function (scope) {
      var block = scope.querySelector(BLOCK);
      var blocked = isBlocked(block);

      scope.querySelectorAll(BUTTONS).forEach(function (btn) {
        btn.classList.toggle('hp-advance-held', blocked);
        if (blocked) {
          btn.setAttribute('aria-disabled', 'true');
        } else {
          btn.removeAttribute('aria-disabled');
        }
      });

      if (!blocked) setError(block, false);
    });
  }

  function boot() {
    /* Capture phase throughout, so these run before the theme's own handlers. */
    document.addEventListener(
      'click',
      function (event) {
        var btn = event.target.closest && event.target.closest(BUTTONS);
        if (!btn) return;
        var scope = btn.closest(SCOPES);
        if (scope) hold(event, scope.querySelector(BLOCK));
      },
      true
    );

    document.addEventListener(
      'submit',
      function (event) {
        var id = event.target.id;
        if (!id) return;
        hold(event, document.querySelector(BLOCK + '[data-form-id="' + id + '"]'));
      },
      true
    );

    document.addEventListener('change', function (event) {
      if (event.target.matches('[data-hp-advance-consent]')) sync();
    });

    /* The cart sections are replaced wholesale on every cart change, which
       resets the consent box — so the buttons need re-marking each time. */
    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.cartUpdate, sync);
    }
    document.addEventListener('shopify:section:load', sync);

    sync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
