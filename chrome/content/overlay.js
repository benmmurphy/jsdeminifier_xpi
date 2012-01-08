(function() {
  Components.utils.import("resource://jsbeautifier_js/module.js");

  function selected_config() {
  
    if (gBrowser.selectedBrowser == null) {
      return null;
    }
    var browser = gBrowser.selectedBrowser;
    if (browser != null) {

      var cfg = jsbeautifier.getConfig(browser);
      return cfg;
    }
    
    return null;
  };

  function update_text() {
    var enabled = get_enabled();
    update_status_text(enabled);
    update_menu(enabled);
  }

  function get_enabled() {
    var cfg = selected_config();
    return cfg == null ? false : cfg.active;
  }

  function update_menu(enabled) {
    document.getElementById("enable_jsdeminifier").setAttribute("checked", enabled ? "true" : "false");
    document.getElementById("disable_jsdeminifier").setAttribute("checked", enabled ? "false" : "true");
  }

  function update_status_text(enabled) {
    document.getElementById("jsbStatus").label = enabled ? "JSD ON" : "JSD OFF";
  }

  function toggle() {
    
    var cfg = selected_config();
      if (cfg != null) {
        cfg.active = !cfg.active;
        update_text();
      }
    
  };

  function set_active(active) {
    var cfg = selected_config();
    if (cfg != null) {
      cfg.active = active;
      update_text();
     }
  }

  function disable() {
    set_active(false);
  }

  function enable() {
    set_active(true);
  }

  function load() {
    hookup_tabs();  
    document.getElementById("jsbStatus").addEventListener("click", toggle, false);
    document.getElementById("enable_jsdeminifier").addEventListener("command", enable, false);
    document.getElementById("disable_jsdeminifier").addEventListener("command", disable, false);
    update_text();
  };
  
  function unload() {
    var container = gBrowser.tabContainer;
    for (var i = 0; i < container.childNodes.length; ++i) {
      jsbeautifier.remove(gBrowser.getBrowserForTab(container.childNodes[i]));
    }
    container.removeEventListener("TabOpen", tabOpen, false);  
    container.removeEventListener("TabClose", tabClose, false);
    container.removeEventListener("TabSelect", tabClose, false);
  };
  
  function tabOpen(event) {
    var browser = gBrowser.getBrowserForTab(event.target);
    jsbeautifier.add(browser, window.Worker);
  };
  
  function tabClose(event) {
    var browser = gBrowser.getBrowserForTab(event.target);
    jsbeautifier.remove(browser);
  };
  
  function tabSelect(event) {
    update_text();
  };
  

  function hookup_tabs() {  
    var container = gBrowser.tabContainer;  
    if (container) {
      container.addEventListener("TabOpen", tabOpen, false);  
      container.addEventListener("TabClose", tabClose, false);
      container.addEventListener("TabSelect", tabSelect, false);  
      for (var i = 0; i < container.childNodes.length; ++i) {
        jsbeautifier.add(gBrowser.getBrowserForTab(container.childNodes[i]), window.Worker);
      }
    }
  }
  
  window.addEventListener("load", load, false);
  window.addEventListener("unload", unload, false);


})();

