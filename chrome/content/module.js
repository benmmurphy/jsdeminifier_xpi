var EXPORTED_SYMBOLS = ["jsbeautifier"]; 


jsbeautifier = {
	windows : [],
	
	add: function(browser, worker) {
		this.windows.push({browser: browser, cfg: {active:false}, worker: worker});
	},
	
	getConfig: function(browser) {
		for (var i = 0; i < this.windows.length; ++i) {
			if (this.windows[i].browser == browser) {
				return this.windows[i].cfg;
			}
		}
	},
	
	remove: function(browser) {
		var idx = -1;
		/* when tabs are migrated we get a TabOpen followed by a TabClose */
		for (var i = 0; i < this.windows.length; ++i) {
			if (this.windows[i].browser == browser) {
				idx = i;
				break;
			}
		}
		
		if (idx >= 0) {
			this.windows.splice(idx, 1);
		}
	}
};

var jsb = function() {

	const Cc = Components.classes;
	const Ci = Components.interfaces;
	
	var contentTypes = ["text/javascript", "application/javascript", "application/x-javascript"];
	
		
	var prefsObserver = {
		observe : function(subject, topic, data) {
			if (topic != "nsPref:changed") {
				return;
			}
			
			if (data == "contenttypes") {
				this.updateContentTypes();
			}
		},
		
		updateContentTypes: function() {
			contentTypes = this.prefs.getCharPref("contenttypes").split(",");
		},
		
		register : function() {
			this.prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.jsdeminifier.");
			this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
			this.prefs.addObserver("", this, false);
			this.updateContentTypes();
		},
		
		QueryInterface : function(aIID) {
			if (aIID.equals(Ci.nsIObserver) ||
				aIID.equals(Ci.nsISupports))
			{
				return this;
			}
	
			throw Components.results.NS_NOINTERFACE;
		}
	};
	
	var httpRequestObserver = {
		observe: function(subject, topic, data) {
			if ((topic == 'http-on-examine-response' || topic == 'http-on-examine-cached-response')) {
				if (subject instanceof Ci.nsIHttpChannel) {
					
					
					subject.QueryInterface(Ci.nsITraceableChannel);
					subject.QueryInterface(Ci.nsIHttpChannel);
					
					var context = this.getContext(this.getWindowFromChannel(subject));

					if (context != null  && context.cfg.active) {
						var newListener = new JSBeautifierListener();
						newListener.worker = context.worker;
						newListener.originalListener = subject.setNewListener(newListener);
					}
				}
			}
		},
		
		
		getWindowFromChannel: function(aChannel) {
			var ctx = this.getLoadContext(aChannel);
			if (ctx) {
				return ctx.associatedWindow;
			}
			
			return null;
		},
		
		getContext : function(win)
		{
			for (; win; win = win.parent) {
				for (var i = 0; i < jsbeautifier.windows.length; ++i) {
					var entry =  jsbeautifier.windows[i];
					if (entry.browser.contentWindow == win) {
						return entry;
					}
				}
				
				if (win.parent == win) {
					return null;
				}
			}
		    return null;
		},
		
		
		getLoadContext: function (aChannel) {  
			try {  
				if (aChannel.notificationCallbacks) {
					return aChannel.notificationCallbacks.getInterface(Ci.nsILoadContext);
				}
			} catch (e) {
				
			}
		   
			try {
				if (aChannel && aChannel.loadGroup && aChannel.loadGroup.notificationCallbacks) {
					return aChannel.loadGroup.notificationCallbacks.getInterface(Ci.nsILoadContext);
				}
			} catch (e) {
				
			}
		     
		
		   return null; 
		},
		
		

		register: function() {
			var observerService = Cc["@mozilla.org/observer-service;1"]
				.getService(Ci.nsIObserverService);

			observerService.addObserver(this,
				"http-on-examine-cached-response", false);
			observerService.addObserver(this,
				"http-on-examine-response", false);
		},

		
		QueryInterface : function(aIID) {
			if (aIID.equals(Ci.nsIObserver) ||
				aIID.equals(Ci.nsISupports))
			{
				return this;
			}
	
			throw Components.results.NS_NOINTERFACE;
		}
	};
	
	
	function CCIN(cName, ifaceName) {
    	return Cc[cName].createInstance(Ci[ifaceName]);
	}

	function JSBeautifierListener() {
		this.intercept = false;
		this.receivedData = [];
	}
	
	JSBeautifierListener.prototype.isJavascript = function(subject) {
			try {
				if (subject instanceof Components.interfaces.nsIHttpChannel) {
					var contentType = subject.getResponseHeader("Content-Type");
					if (contentType == null) {
						return false;
					}
					
					for (var i = 0; i < contentTypes.length; ++i) {
						if (contentType.indexOf(contentTypes[i]) !== -1) {
							return true;
						} 
					}
					
					return false;
				}
			} catch (err) {
				// ignore
			}
			
			return false;
	};
		
	JSBeautifierListener.prototype.onDataAvailable = function(request, context, inputStream, offset, count) {
		if (this.intercept) {
			var binaryInputStream = CCIN("@mozilla.org/binaryinputstream;1",
					"nsIBinaryInputStream");
	
			binaryInputStream.setInputStream(inputStream);
			var data = binaryInputStream.readBytes(count);
			this.receivedData.push(data);
		} else {
			try {
				this.originalListener.onDataAvailable(request, context, inputStream, offset, count);
			} catch (err) {
				request.cancel(err.result);
			}
		}
	};
	
	JSBeautifierListener.prototype.onStartRequest = function(request, context) {
		this.intercept = this.isJavascript(request);
		try {
			this.originalListener.onStartRequest(request, context);
		} catch (err) {
			request.cancel(err.result);
		}
	};
	
	JSBeautifierListener.prototype.spawnWorker = function(request, context, statusCode) {
		var worker = new this.worker("chrome://jsbeautifier/content/worker.js");
		worker.postMessage(this.receivedData);
		this.receivedData = null;
		
		var t = this;
		var onMessage = function(event) {
			var new_js = event.data;
			var storageStream = CCIN("@mozilla.org/storagestream;1", "nsIStorageStream");
			storageStream.init(8192, new_js.length, null);
			var os = storageStream.getOutputStream(0);
			os.write(new_js, new_js.length);
			os.close();

			try {
				t.originalListener.onDataAvailable(request, context, storageStream.newInputStream(0), 0, new_js.length);
			} catch (err) {
				// ignore .. this is after onStopRequest.. so there is not much we can do..
			}
			
			try {
				t.originalListener.onStopRequest(request, context, statusCode);
			} catch (err) {
				// ignore .. this is after onStopRequest.. so there is not much we can do..
			}
		};
		worker.onmessage = onMessage;
	};
		
	JSBeautifierListener.prototype.onStopRequest = function(request, context, statusCode) {
		if (this.intercept) {
			this.spawnWorker(request, context, statusCode);
		} else {
			try {
				this.originalListener.onStopRequest(request, context, statusCode);
			} catch (err) {
				// ignore
			}
		}
	};
	
	JSBeautifierListener.prototype.QueryInterface = function(aIID) {
			if (aIID.equals(Ci.nsIStreamListener) ||
				aIID.equals(Ci.nsISupports)) {
				return this;
			}
			throw Components.results.NS_NOINTERFACE;
	};
	
	prefsObserver.register();
	httpRequestObserver.register();
	
    
}();


