var EXPORTED_SYMBOLS = ["jsbeautifier"]; 

var jsbeautifier = {active:false, listeners: []};

jsbeautifier.addListener = function(l) {
	this.listeners.push(l);
};

jsbeautifier.removeListener = function(l) {
	var i = this.listeners.indexOf(l);
	if (i < 0) {
		return;
	}
	Components.utils.reportError("removing listener: " + i);
	this.listeners.splice(i, 1);
	Components.utils.reportError("listeners: " + this.listeners);
};

jsbeautifier.toggle = function() {
	this.active = !this.active;
	for (var i = 0; i < this.listeners.length; ++i) {
		this.listeners[i]();
	}
};

var jsb = function() {

	const Cc = Components.classes;
	const Ci = Components.interfaces;
	
	
		
		
	var httpRequestObserver = {
		observe: function(subject, topic, data) {
			
			if (jsbeautifier.active && (topic == 'http-on-examine-response' || topic == 'http-on-examine-cached-response')) {
				if (subject instanceof Components.interfaces.nsIHttpChannel) {
					var newListener = new JSBeautifierListener();
					subject.QueryInterface(Ci.nsITraceableChannel);
					newListener.originalListener = subject.setNewListener(newListener);
				}
			}
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
			if (subject instanceof Components.interfaces.nsIHttpChannel) {
				var contentType = subject.getResponseHeader("Content-Type");
				return contentType != null && (contentType.indexOf("text/javascript") !== -1 || contentType.indexOf("application/javascript") !== -1);
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
			this.originalListener.onDataAvailable(request, context, inputStream, offset, count);
		}
	};
	
	JSBeautifierListener.prototype.onStartRequest = function(request, context) {
		this.intercept = this.isJavascript(request);

		this.originalListener.onStartRequest(request, context);
	};
	
	JSBeautifierListener.prototype.spawnWorker = function(request, context, statusCode) {
		var worker = new jsbeautifier.Worker("chrome://jsbeautifier/content/worker.js");
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
			t.originalListener.onDataAvailable(request, context, storageStream.newInputStream(0), 0, new_js.length);
			t.originalListener.onStopRequest(request, context, statusCode);
		};
		worker.onmessage = onMessage;
	};
		
	JSBeautifierListener.prototype.onStopRequest = function(request, context, statusCode) {
		if (this.intercept) {
			this.spawnWorker(request, context, statusCode);
		} else {
			this.originalListener.onStopRequest(request, context, statusCode);
		}
	};
	
	JSBeautifierListener.prototype.QueryInterface = function(aIID) {
			if (aIID.equals(Ci.nsIStreamListener) ||
				aIID.equals(Ci.nsISupports)) {
				return this;
			}
			throw Components.results.NS_NOINTERFACE;
	};
	
	var observerService = Cc["@mozilla.org/observer-service;1"]
		.getService(Ci.nsIObserverService);
	
	observerService.addObserver(httpRequestObserver,
		"http-on-examine-cached-response", false);
	observerService.addObserver(httpRequestObserver,
		"http-on-examine-response", false);
	
	

    
}();


