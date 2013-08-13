Navigation
==========

jQuery plugin on top of "jQuery Address" to rapidly implement full Ajax navigation.

[jQuery Address](https://github.com/asual/jquery-address)


Default options
---------------

```javascript

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
        // - function(string key, object content, callback updated)
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

```


Events
------

### change.navigation

### changed.navigation

### load.navigation

### loaded.navigation

### created.navigation

### updated.navigation

### shown.navigation

### hidden.navigation
