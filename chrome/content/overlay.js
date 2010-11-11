(function() {
	Components.utils.import("resource://modules/module.js");

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
		
		
		
		var label = "JSB OFF";

			var cfg = selected_config();
			if (cfg != null) {
				label = cfg.active ? "JSB ON" : "JSB OFF";
			}
		
		
		document.getElementById("jsbStatus").label = label;
	};

	function toggle() {
		
		var cfg = selected_config();
			if (cfg != null) {
				cfg.active = !cfg.active;
				update_text();
			}
		
	};

	function load() {
		
		document.getElementById("jsbStatus").addEventListener("click", toggle, false);
		update_text();
	};
	
	function unload() {
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
	
	
	var container = gBrowser.tabContainer;  
	container.addEventListener("TabOpen", tabOpen, false);  
 	container.addEventListener("TabClose", tabClose, false);
	container.addEventListener("TabSelect", tabSelect, false);  
	
	for (var i = 0; i < container.childNodes.length; ++i) {
		jsbeautifier.add(gBrowser.getBrowserForTab(container.childNodes[i]), window.Worker);
	}
	
	window.addEventListener("load", load, false);
	window.addEventListener("unload", unload, false);


})();

