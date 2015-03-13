(function(JSON) {
	'use strict';

	function Wok(config) {
		this.config = {
			pluginClass: 'wok-',
			pluginPrefix: 'wok-'
		};
		for(var key in config) {
			this.config[key] = config[key];
		}

		this.pipes = {};

		this.plugins = {};

		this.debug = false;
	}

	Wok.prototype.use = function(name, plugin) {
		var originalName = name;
		if(!plugin) {
			plugin = Wok.plugins[name];
		}
		if(typeof plugin === 'string') {
			originalName = plugin;
			plugin = this.plugins[plugin];
		}
		if(!plugin) {
			throw new Error('Plugin '+originalName+' not known to Wok.');
		}
		this.plugins[name] = plugin;
	};
	
	Wok.prototype.init = function(element) {
		for(var name in this.plugins) {
			var plugin = this.plugins[name];
			var elements = element.querySelectorAll('[data-'+this.config.pluginPrefix+name+']');
			for(var i=0;i<elements.length;i++) {
				this._initPlugin(plugin, name, elements[i]);
			}
		}
	};

	Wok.prototype._initPlugin = function(plugin, name, element) {
		// jshint maxstatements: false
		var attr = (element.getAttribute('data-'+this.config.pluginPrefix+name)||'').trim().split('/');
		var input = attr.shift();
		var output = attr.shift();

		var pluginControls;
		var stage = {};
		if(input) {
			stage.input = [input, function() {
				return pluginControls.render.apply(this, arguments);
			}];
			// Set the input function’s display name to make debugging easier
			stage.input[1].displayName = name+'/'+input+'/input';
		}
		if(output) {
			stage.output = [output, function() {
				return pluginControls.request.apply(this, arguments);
			}];
			// Set the output function’s display name to make debugging easier
			stage.output[1].displayName = name+'/'+output+'/output';
		}

		stage = this.register(stage);
		stage.inputName = input || undefined;
		stage.outputName = output || undefined;
		var args = JSON.parse('['+attr.join('/')+']');
		args.unshift(element);
		pluginControls = plugin.apply(stage, args);

		if(!pluginControls) {
			throw new Error('Wok plugin '+name+' did not return controls');
		}

		var requestImmediately, renderImmediately;
		if(pluginControls.request === true) {
			requestImmediately = true;
			delete pluginControls.request;
		}
		if(pluginControls.render === true) {
			renderImmediately = true;
			delete pluginControls.render;
		}

		// Sanity-check pluginControls
		if(input && !('render' in pluginControls)) {
			throw new Error('Wok plugin “'+name+'” not meant to be used with input pipes');
		}
		if(output && !('request' in pluginControls)) {
			throw new Error('Wok plugin “'+name+'” not meant to be used with output pipes');
		}

		if(requestImmediately) {
			stage.request();
		}
		if(renderImmediately) {
			stage.render();
		}

		if(this.config.pluginClass !== null) {
			element.className += ' '+this.config.pluginClass+name;
		}
	};
	
	/**
	 * Returns the complete defintion of a pipe
	 */
	Wok.prototype._getPipe = function(pipeName) {
		if(!(pipeName in this.pipes)) {
			this.pipes[pipeName] = {
				source: null,
				destinations: []
			};
		}
		return this.pipes[pipeName];
	};

	/**
	 * Returns the complete defintion of a stage.
	 */
	Wok.prototype._getStage = function(inputPipeName, outputPipeName) {
		var result = {};
		if(inputPipeName) {
			result.request = this.request.bind(this, inputPipeName);
		}
		if(outputPipeName) {
			result.render = this.render.bind(this, outputPipeName);
		}
		result.wok = this;
		return result;
	};

	/**
	 * Registers a stage with the specified input and output pipes
	 */
	Wok.prototype.register = function(stage) {
		var inputPipeName, outputPipeName;
		if('input' in stage) {
			inputPipeName = stage.input[0];
			this.subscribe(inputPipeName, stage.input[1]);
		}
		if('output' in stage) {
			outputPipeName = stage.output[0];
			this.provide(outputPipeName, stage.output[1]);
		}
		return this._getStage(inputPipeName, outputPipeName);
	};
	
	/**
	 * The most fundamental part of a Wok.js pipe is the provider,
	 * the function that listens to request on a pipe (and hopefully responds with `wok.render`).
	 * There is only one provider per pipe.
	 * @param provider will be the function that is called whenever the configuration for this pipe changes and
	 *                 indicates to the source that it should call `wok.render` with updated data.
	 * @param replace If you want to call `wok.provide` multiple times for the same pipe in
	 *                order to replace the previous provider, set the this to `true`.
	 */
	Wok.prototype.provide = function(pipeName, source, replace) {
		var wok = this._getPipe(pipeName);
		if(wok.source && !replace) {
			throw new Error('Cannot replace defined pipe “'+pipeName+'”’s source');
		}
		wok.source = source;
	};

	/**
	 * Use `wok.subscribe` to register a function that displays data.
	 * Whenever a pipe gets rendered, the `subscriber` gets called with the updated data.
	 * The idea is for the subscriber to either display the data or pass a modified version on to a different pipe.
	 */
	Wok.prototype.subscribe = function(pipeName, destination) {
		var wok = this._getPipe(pipeName);
		wok.destinations.push(destination);
	};
	
	/**
	 * Renders a pipe by updating all its destinations
	 */
	Wok.prototype.render = function(pipeName, data) {
		// jshint unused: false
		var wok = this._getPipe(pipeName);
		var args = Array.prototype.slice.call(arguments, 1);
		if(this.debug) {
			console.debug('Wok rendering '+pipeName+'', args, wok.destinations);
		}
		for(var i=0;i<wok.destinations.length;i++) {
			wok.destinations[i].apply(this, args);
		}
	};

	/**
	 * Requests data from a pipe. Configuration options are passed along to the source
	 */
	Wok.prototype.request = function(pipeName, options) {
		// jshint unused: false
		var wok = this._getPipe(pipeName);
		var args = Array.prototype.slice.call(arguments, 1);
		if(this.debug) {
			console.debug('Wok requesting '+pipeName+'', args, wok.source);
		}
		return wok.source.apply(this, args);
	};

	Wok.plugins = {};

	window.Wok = Wok;
})(window.JSON);