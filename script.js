// Stripe menu recreated with help from Chris Wilson: https://codepen.io/heychris
// Helpers stores useful functions
var Helpers = {
  queryArray: function(e, t) {
    return t || (t = document.body), Array.prototype.slice.call(t.querySelectorAll(e));
  },
  ready: function(e) {
    document.readyState == 'complete' ? e() : document.addEventListener('DOMContentLoaded', e);
  }
};

function NavDropdown(element) {
  var self = this;

  this.container = document.querySelector(element);
  this.root = this.container.querySelector('.Nav-base');
  this.isCompact = !1;

  this.root.classList.add('allowExpand');
  this.container.classList.add('noDropdownTransition');

  this.dropdownBackground = this.container.querySelector('.Dropdown-bg');
  this.dropdownBackgroundAlt = this.container.querySelector('.Dropdown-bg--alt');
  this.dropdownContainer = this.container.querySelector('.Dropdown-container');
  this.dropdownArrow = this.container.querySelector('.Dropdown-arrow');

  this.dropdownSections = Helpers.queryArray('.Dropdown-section', this.container)
  .map(function(element) {
    return {
      el: element,
      name: element.getAttribute('data-dropdown'),
      content: element.querySelector('.Dropdown-content')
    };
  });

  this.dropdownContainer.addEventListener('mouseenter', function(e) {
    self.stopCloseTimeout();
  });

  this.dropdownContainer.addEventListener('mouseleave', function(e) {
    self.startCloseTimeout();
  });

  this.dropdownRoots = Helpers.queryArray('.hasDropdown', this.root);

  // Add event listeners
  this.dropdownRoots.forEach(function(e, n) {
    e.addEventListener('mouseenter', function(n) {
      self.stopCloseTimeout();
      self.openDropdown(e);
    });

    e.addEventListener('mouseleave', function(e) {
      self.startCloseTimeout();
    });
  });
}

// Prototype an open function
NavDropdown.prototype.openDropdown = function(e) {
  var self = this;

  // if something is active return
  if (this.activeDropdown === e) return;

  this.container.classList.add('dropdownActive');
  this.activeDropdown = e;

  this.dropdownRoots.forEach(function(e, t) {
    e.classList.remove('active');
  });

  e.classList.add('active');

  // ---------------------------------------------------------------------------

  var data = e.getAttribute('data-dropdown'),
  direction = 'left',
  offsetWidth, offsetHeight, content;

  this.dropdownSections.forEach(function(e) {
    e.el.classList.remove('active');
    e.el.classList.remove('left');
    e.el.classList.remove('right');

    e.name == data ? (
      e.el.classList.add('active'),
      direction = 'right',
      offsetWidth = e.content.offsetWidth,
      offsetHeight = e.content.offsetHeight,
      content = e.content
      ) : e.el.classList.add(direction);
  });

  var width = offsetWidth / 520,
  height = offsetHeight / 400,
  offset = e.querySelector('.rootLink').getBoundingClientRect(),
  position = offset.left + offset.width / 2 - offsetWidth / 2,
  adjustedHeight = content.children[0].offsetHeight / height,
  placement = Math.round(offset.left + offset.width / 2);

  position = Math.round(Math.max(position, 10));

  clearTimeout(this.disableTransitionTimeout);

  this.enableTransitionTimeout = setTimeout(function() {
    self.container.classList.remove('noDropdownTransition');
  }, 50);

  this.dropdownBackground.style.transform = 'translateX(' + position + 'px) scaleX(' + width + ') scaleY(' + height + ')';

  this.dropdownContainer.style.transform = 'translateX(' + position + 'px)';
  this.dropdownContainer.style.width = offsetWidth + 'px';
  this.dropdownContainer.style.height = offsetHeight + 'px';

  this.dropdownArrow.style.transform = 'translateX(' + placement + 'px) rotate(45deg)';

  this.dropdownBackgroundAlt.style.transform = 'translateY(' + adjustedHeight + 'px)';
};

NavDropdown.prototype.closeDropdown = function() {
  var self = this;

  if (!this.activeDropdown) return;

  this.dropdownSections.forEach(function(e) {
    e.el.classList.remove('active');
    e.el.classList.remove('left');
    e.el.classList.remove('right');
  });

  this.dropdownRoots.forEach(function(e, t) {
    e.classList.remove('active');
  });

  clearTimeout(this.enableTransitionTimeout);

  this.disableTransitionTimeout = setTimeout(function() {
    self.container.classList.add('noDropdownTransition');
  }, 50);

  this.container.classList.remove('dropdownActive');
  this.activeDropdown = undefined;
};

NavDropdown.prototype.startCloseTimeout = function() {
  var self = this;

  this.closeDropdownTimeout = setTimeout(function() {
    self.closeDropdown();
  }, 50);
};

NavDropdown.prototype.stopCloseTimeout = function() {
  var self = this;

  clearTimeout(self.closeDropdownTimeout);
};

// Initialize on document ready
Helpers.ready(function() {
  new NavDropdown('.Nav');
});

// End of stripe menu :)