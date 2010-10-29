Components.utils.import("resource://modules/module.js");
jsbeautifier.Worker = Worker;

function update_text() {
	document.getElementById("jsbStatus").label = jsbeautifier.active ? "JSB ON" : "JSB OFF";
};

function toggle() {
	jsbeautifier.toggle();
};

function load() {
	update_text();
	jsbeautifier.addListener(update_text);
	document.getElementById("jsbStatus").addEventListener("click", toggle, false);
};

function unload() {
	jsbeautifier.removeListener(update_text);
};

window.addEventListener("load", load, false);
window.addEventListener("unload", unload, false);
