(function ($, undefined) {

  "use strict";


  // NAVIGATION CLASS DEFINITION
  // ===========================

  if ($.address === undefined) {
    return;
  }

  function Navigation (element, options) {
    this.$element    = $(element);
    this.options     = $.extend({}, Navigation.DEFAULTS, options);

    this.initialized = false;
    this.reloaded    = false;
    this.states      = {};
    this.$contents   = {};
    this.$title      = $('title');

    $.address
      .state(this.options.baseUrl)
      .init($.proxy(this.init, this))
      .change($.proxy(this.change, this))
    ;
  };

  Navigation.DEFAULTS = {

    // Base URL
    // - string
    baseUrl : '/',

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
        update: 'html',

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

    init: function (e) {
      var self = this;

      this.log('init');

      self.$element.on('click', self.options.navSelector, function (e) {
        var target = e.currentTarget;

        if (e.shiftKey || e.ctrlKey || e.metaKey || e.which == 2) {
            return true;
        }

        if ($(target).is('a')) {
          var value = /address:/.test($(target).attr('rel'))
              ? $(target).attr('rel').split('address:')[1].split(' ')[0]
              : $.address.state() !== undefined && !/^\/?$/.test($.address.state())
                ? $(target).attr('href').replace(new RegExp('^(.*' + $.address.state() + '|\\.)'), '')
                : $(target).attr('href').replace(/^(#\!?|\.)/, '');

          e.preventDefault();
          $.address.value(value);
        }
      });

      self.$element.on('submit', self.options.navSelector, function (e) {
        var target = e.currentTarget,
            action, value;

        if ($(target).is('form')) {
            e.preventDefault();
            action = $(target).attr('action');
            value = (action.indexOf('?') != -1
              ? action.replace(/&$/, '')
              : action + '?') + $(target).serialize();
            $.address.value(value);
        }
      });

    },

    change: function (e) {
      var path = e.path;

      this.log('change', path);
      this.$element.trigger('change.navigation', e);

      if (!this.initialized) {

        this.initialized = true;
        this.log('initialized', path);

      } else if (!this.reloaded) {

        this.handler(e);
        this.reloaded = true;
        this.log('reloaded', path);

      } else if (this.hasState(path)) {

        this.handler(e);

      } else {

        this.log('load', path);
        this.$element.trigger('load.navigation', path);

        $.ajax({
          url: $.address.state() + path,
          dataType: 'html',
          success: $.proxy(this.handler, this, e),
          error: $.proxy(this.error, this, e)
        });

      }
    },

    handler: function (e, data, status, xhr) {
      var path = e.path;

      this.log('handle', path);

      if (data) {
        this.saveContents(e.path, data);
      } else if (!this.reloaded) {
        this.saveContents(e.path, document);
      }

      if (this.initialized && this.reloaded) {
        this.updateNav(path);
        this.updateContents(path);
      }

      if (xhr) {
        this.log('loaded', path);
        this.$element.trigger('loaded.navigation', [path, data, status, xhr]);
      }

      if (this.initialized) {
        this.log('changed', path);
        this.$element.trigger('changed.navigation', [path, data, status, xhr]);
      }
    },

    error: function (e, xhr, status, error) {
      this.log('error', arguments);
      this.$element.trigger('error.navigation', [e, xhr, status, error]);
    },

    updateNav: function (path, $context) {
      var options = this.options,
          $links, url;

      if (!this.initialized) {
        return;
      }

      $context = $context || document;
      $links   = $context === document
        ? $(this.options.navSelector)
        : $('a', $context).filter(this.options.navSelector);
      url      = options.baseUrl.replace(/\/$/, '') + '/' + path.replace(/^\//, '');

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

    saveContents: function (path, data) {
      var self = this,
          options = this.options,
          $content,
          title;

      this.log('save', path);

      if (data !== undefined) {

        // Title
        if (title = $('title', data).html()) {
          this.setStateContent(path, 'title', title);
        } else if (title = data.match('<title>(.*)</title>')) {
          this.setStateContent(path, 'title', title[1]);
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

            if (!self.hasContentElement(key)) {
              self.setContentElement(key, $currentContent);
            }

            self.setStateContent(path, key, $newContent.html());
          } else {
            self.log(path+' has no '+key);
          }
        });
      }
    },

    updateContents: function (path) {
      var self = this,
          options = this.options,
          $content;

      this.log('update', path);

      // Title
      this.$title.html(this.getStateContent(path, 'title'));

      // Contents
      $.each(options.contents, function (key, content) {
        if (self.hasStateContent(path, key)) {
          self._updateContent(path, key, content);
        } else if (self.hasContentElement(key)) {
          self._hideContent(path, key, content);
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

    _updateContent: function (path, key, content) {
      var self = this,
          update   = content.update !== undefined ? content.update : 'html',
          html     = this.getStateContent(path, key),
          $content = this.getContentElement(key),
          updated  = function () {
            self.log('updated', key);
            self.updateNav(path, $content);
            $content.trigger('updated.navigation');
          };

      if (update) {

        this.log('update', path, key);

        if (typeof update == 'function') {
          update.call($content, html, key, content, updated);
        } else {
          switch (update) {
            case true:
            case 'html':
              $content.html(html);
              updated();
              break;
            case 'text':
              $content.text(html);
              updated();
              break;
            case 'fade':
              $content.fadeTo(400, 0, function () {
                $content.html(html);
                $content.fadeTo(400, 1, updated);
              });
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

    _hideContent: function (path, key, content) {
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

    setState: function (path, state) {
      this.states[path] = state;
      return this;
    },

    getState: function (path) {
      return this.states[path];
    },

    hasState: function (path) {
      return this.states[path] !== undefined;
    },

    setStateContent: function (path, key, value) {
      if (this.states[path] === undefined) {
        this.states[path] = {};
      }
      this.states[path][key] = value;
      return this;
    },

    getStateContent: function (path, key) {
      if (this.states[path]) {
        return this.states[path][key];
      }
      return undefined;
    },

    hasStateContent: function (path, key) {
      return this.states[path] !== undefined
          && this.states[path][key] !== undefined;
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

  $.fn.navigation = function (option) {
    var $this   = $(this),
        data    = $this.data('wxr.navigation'),
        options = typeof option == 'object' && option;

    if (!data) {
      $this.data('wxr.navigation', (data = new Navigation(this, options)));
    }
  };


  // NAVIGATION NO CONFLICT
  // ======================

  $.fn.navigation.noConflict = function () {
    $.fn.navigation = old;
    return this;
  };

})(window.jQuery);
