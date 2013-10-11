(function ($, window, document, undefined) {

  "use strict";

  if (!window.History || !History.enabled) {
    throw new Error('History.js is required');
  }


  // NAVIGATION CLASS DEFINITION
  // ===========================

  function Navigation (options) {
    this.$window     = $(window);
    this.$body       = $(document.body);
    this.options     = $.extend({}, Navigation.DEFAULTS, options);

    this.initialized  = false;
    this.states       = {};
    this.$contents    = {};
    this.$title       = $('title');

    $($.proxy(this.init, this));
    $(window).on('statechange', $.proxy(this.change, this));
  };

  Navigation.DEFAULTS = {

    // Nav selector
    // - string
    navSelector: '#menu a',

    // Nav active class
    // - string
    navActiveClass: 'active',

    // Nav function to use instead default one
    // - undefined
    // - function(url)
    updateNav: undefined,

    // Contents dictionnary
    // - object
    contents: {

      // All this object is equivalent to "#main"
      main: {

        // Container selector
        // - string
        selector: '#main',

        // Create method
        // - undefined, true, 'append' (default)
        // - 'prepend'
        // - function(string key, object content, callback created)
        create: 'append',

        // Update method
        // - undefined, true, 'fade' (default)
        // - 'html'
        // - 'text'
        // - 'prepend'
        // - 'append'
        // - function(string html, string key, object content, callback updated)
        update: 'fade',

        // Show method
        // - undefined, true, 'fade' (default)
        // - 'show'
        // - function(string key, object content, callback shown)
        show: 'fade',

        // Hide method
        // - undefined, true, 'fade' (default)
        // - 'hide'
        // - function(string key, object content, callback hidden)
        hide: 'fade'
      }
    },

    // Enable/disable logs
    debug: false
  };

  $.extend(Navigation.prototype, {

    log: function () {
      if (this.options.debug && window.console) {
        console.log.apply(console, arguments);
      };
    },

    init: function () {
      var self  = this,
          state = History.getState(),
          url   = state.url;

      self.log('init');

      self.$body.on('click', self.options.navSelector, function (e) {
        var $this = $(e.currentTarget),
            url = $this.attr('href'),
            title = $this.attr('title') || null;

        if (e.shiftKey || e.ctrlKey || e.metaKey || e.which == 2) {
            return true;
        }

        if ($this.is('a')) {
          e.preventDefault();
          History.pushState(null, title, url);
        }

      });

      this.handler(url);

      this.initialized = true;
      this.log('initialized');

    },

    change: function () {
      var state = History.getState(),
          url   = state.url;

      this.log('change');
      this.$body.trigger('change.navigation', url);

      if (this.hasState(url)) {

        this.handler(url);

      } else {

        this.log('load', url);
        this.$body.trigger('load.navigation', url);

        $.ajax({
          url: url,
          dataType: 'html',
          success: $.proxy(this.handler, this, url),
          error: $.proxy(this.error, this, url)
        });

      }
    },

    handler: function (url, data, status, xhr) {
      this.log('handle', url);

      if (data) {
        this.saveContents(url, data);
      } else if (!this.initialized) {
        this.saveContents(url, document);
      }

      if (this.initialized) {
        this.updateNav(url);
        this.updateContents(url);
      }

      if (xhr) {
        this.log('loaded', url);
        this.$body.trigger('loaded.navigation', [url, data, status, xhr]);
      }

      if (this.initialized) {
        this.log('changed', url);
        this.$body.trigger('changed.navigation', [url, data, status, xhr]);
      }
    },

    error: function (e, xhr, status, error) {
      this.log('error', arguments);
      this.$body.trigger('error.navigation', [e, xhr, status, error]);
    },

    updateNav: function (url, $context) {
      var options = this.options,
          $links;

      if (!this.initialized) {
        return;
      }

      $context = $context || undefined;
      $links   = $context === undefined
        ? $(this.options.navSelector)
        : $('a', $context).filter(this.options.navSelector);

      if (typeof options.updateNav == 'function') {
        options.updateNav.call($links, url);
      } else {
        $links.each(function() {
          var $this = $(this);
          if ($this.attr('href') == url) {
            $this.parent().addClass(options.navActiveClass);
          } else {
            $this.parent().removeClass(options.navActiveClass);
          }
        });
      }
    },

    saveContents: function (url, data) {
      var self = this,
          options = this.options,
          title;

      this.log('save', url);

      if (data !== undefined) {

        // Title
        if (title = $('title', data).html()) {
          this.setStateContent(url, 'title', title);
        } else if (title = data.match('<title>(.*)</title>')) {
          this.setStateContent(url, 'title', title[1]);
        }

        // Contents
        $.each(options.contents, function (key, content) {
          var selector        = typeof content == 'string' ? content : content.selector,
              $currentContent = self.getContentElement(key) || $(selector),
              $newContent     = $(selector, data);

          // Set content
          if ($newContent.length) {
            if (!$currentContent.length) {
              // Create
              $currentContent = self._createContent(key, content, $newContent);
            }

            // Init
            self._initContent(key, content, $currentContent);

            if (!self.hasContentElement(key)) {
              self.setContentElement(key, $currentContent);
            }

            self.setStateContent(url, key, $newContent.html());
          } else {
            self.log(url+' has no '+key);
          }
        });
      }
    },

    updateContents: function (url) {
      var self = this,
          options = this.options;

      this.log('update', url);

      // Title
      this.$title.html(this.getStateContent(url, 'title'));

      // Contents
      $.each(options.contents, function (key, content) {
        if (self.hasStateContent(url, key)) {
          self._updateContent(url, key, content);
        } else if (self.hasContentElement(key)) {
          self._hideContent(url, key, content);
        }
      });

    },

    _createContent: function (key, content, $content) {
      var self = this,
          create = content.create !== undefined ? content.create : 'append',
          $currentParent, $newParent,
          created = function () {
            self.log('created', key);
            $content.trigger('created.navigation');
          };

      if (create) {

        this.log('create', key);

        if (typeof create == 'function') {
          create.call($content, key, content, created);
        } else {
          $newParent = $content.parent();
          if ($newParent.length) {
            if ($newParent.attr('id')) {
              $currentParent = $('#' + $newParent.attr('id'));
            } else if ($newParent.is('body')) {
              $currentContent = $('body');
            }
          }
          if ($currentParent && $currentParent.length) {
            switch (create) {
              case true:
              case 'append':
                $currentParent.append($content);
                created();
                break;
              case 'prepend':
                $currentParent.prepend($content);
                created();
                break;
              default:
                throw new Error('Create method "'+create+'" is not valid');
            }
          } else {
            this.log('! no valid parent for '+key);
          }
        }

      }

      return $content;
    },

    _initContent: function (key, content, $content) {
      var self = this,
          initialized = function () {
            self.log('initialized', key);
            $content.trigger('initialized.navigation')
          };
      if (typeof content.init == 'function') {
        self.log('initialize', key);
        content.init.call($content, key, content, initialized);
      }
    },

    _updateContent: function (url, key, content) {
      var self = this,
          update   = content.update !== undefined ? content.update : 'fade',
          html     = this.getStateContent(url, key),
          $content = this.getContentElement(key),
          updated  = function () {
            self.log('updated', key);
            self.updateNav(url, $content);
            $content.trigger('updated.navigation');
          };

      if (update) {

        this.log('update', url, key);

        if (typeof update == 'function') {
          update.call($content, html, key, content, updated);
        } else {
          switch (update) {
            case true:
            case 'fade':
              $content.fadeTo(400, 0, function () {
                $content.html(html);
                $content.fadeTo(400, 1, updated);
              });
              break;
            case 'html':
              $content.html(html);
              updated();
              break;
            case 'text':
              $content.text(html);
              updated();
              break;
            case 'prepend':
              $content.prepend(html);
              updated();
              break;
            case 'append':
              $content.append(html);
              updated();
              break;
            default:
              throw new Error('update method "'+update+'" is not supported');
          }
        }

      }

      this._showContent(key, content);
    },

    _showContent: function (key, content) {
      var self = this,
          show     = content.show !== undefined ? content.show : 'fade',
          $content = this.getContentElement(key),
          shown    = function () {
            self.log('shown', key);
            $content.trigger('shown.navigation');
          };

      if (!$content) {
        return;
      }

      this.log('show', key);
      $content.trigger('show.navigation');

      if (show) {
        if (typeof show == 'function') {
          show.call($content, key, content, shown);
        } else {
          switch (show) {
            case true:
            case 'fade':
              $content.fadeIn(shown);
              break;
            case 'show':
              $content.show();
              shown();
              break;
            default:
              throw new Error('Show method "'+show+'" is not supported');
          }
        }
      }

    },

    _hideContent: function (url, key, content) {
      var self = this,
          hide     = content.hide !== undefined ? content.hide : 'fade',
          $content = this.getContentElement(key),
          hidden   = function () {
            self.log('hidden', key);
            $content.trigger('hidden.navigation');
          };

      if (!$content) {
        return;
      }

      this.log('hide', key);
      $content.trigger('hide.navigation');

      if (hide) {
        if (typeof hide == 'function') {
          hide.call($content, key, content, hidden);
        } else {
          switch (hide) {
            case true:
            case 'fade':
              $content.fadeOut(hidden);
              break;
            case 'hide':
              $content.hide();
              hidden();
              break;
            default:
              throw new Error('Hide method "'+hide+'" is not supported');
          }
        }
      }
    },

    setState: function (url, state) {
      this.states[url] = state;
      return this;
    },

    getState: function (url) {
      return this.states[url];
    },

    hasState: function (url) {
      return this.states[url] !== undefined;
    },

    setStateContent: function (url, key, value) {
      if (this.states[url] === undefined) {
        this.states[url] = {};
      }
      this.states[url][key] = value;
      return this;
    },

    getStateContent: function (url, key) {
      if (this.states[url]) {
        return this.states[url][key];
      }
      return undefined;
    },

    hasStateContent: function (url, key) {
      return this.states[url] !== undefined
          && this.states[url][key] !== undefined;
    },

    setContentElement: function (key, $element) {
      this.$contents[key] = $element;
      return this;
    },

    getContentElement: function (key) {
      return this.$contents[key];
    },

    hasContentElement: function (key) {
      return this.$contents[key] !== undefined;
    }

  });


  // NAVIGATION PLUGIN DEFINITION
  // ============================

  var old = $.navigation;

  $.navigation = function (option) {
    var $this   = $(document.body),
        data    = $this.data('wxr.navigation'),
        options = typeof option == 'object' && option;

    if (!data) {
      $this.data('wxr.navigation', (data = new Navigation(options)));
    }
  };


  // NAVIGATION NO CONFLICT
  // ======================

  $.navigation.noConflict = function () {
    $.navigation = old;
    return this;
  };

})(window.jQuery, window, window.document);
