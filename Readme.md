# Wok.js: Pipes for the web [![Build Status](https://travis-ci.org/sabberworm/Wok.js.svg?branch=master)](https://travis-ci.org/sabberworm/Wok.js)

Wok.js is a tiny, dependency-free (IE8+) library for connecting interdependent components or modules (henceforth called “stages”) on your web-site through pipes.

## How does it work?

Fundamentally, Wok.js allows you to have named pipes carrying data and configuration. Pipes have one source and multiple destinations. Usually, data flows from the source to the destinations while configuration flows from a destination to the source. Still confused? How about a small example:

Let’s say you have data from an XMLHttpRequest that you want to let the user filter and then display. You could add two pipes to Wok.js, “data” and “data.filtered”. One stage would provide data to the “data” pipe. The filter stage would subscribe to the data pipe, filter the data and then pass that along to the subscribers of “data.filtered”. If the filter configuration makes it necessary to use the XMLHttpRequest differently, the filter could update the configuration and notify the source.

It’s probably the same concept as [connectors in TerrificJS modules](http://terrifically.org/api/connector/), though I’ve always found them hard to comprehend.

### Is that all?

On the basic level, yes. However, to unify the concept of Wok.js pipes with the DOM, you can register plugins. Plugins are where, as they say, the magic happens: they use the Wok.js API to provide automatic sources and destinations for pipes that are configured in DOM nodes using `data-` attributes. Plugins are what makes Wok.js a compelling choice to see how data flows “through the DOM” (though it does not actually do that) just from looking at the HTML. Wok.js plugins that display data (only have input pipes) work great with templates and I’ve had lots of fun using React with those (then again, almost anything works great with React).

## Nomenclature

So now I’ve used a few different terms to describe part of Wok.js’ functionality: “source”, “destination”, “stage”. What do I actually mean?

Well, it depends what you’re looking at.

From the perspective of a pipe, the words are:


 * “provider” _(n.)_ is the function that gets called when `wok.request` is used to request data from a pipe and pass configuration.
 * “subscriber” _(n.)_ is the function that gets called when a pipe’s source calls `wok.render` to pass data onto a pipe.
 * “source” _(n.)_ to denote the “place” (stage) that defines both the function that calls `wok.render` (this is not particularly relevant from a programming standpoint but it’s conceptually important) as well as the pipe’s provider.
 * A “destination” _(n.)_ is the stage where both a pipe’s subscriber and the function that calls `wok.request` (this, again, is not particularly relevant from a programming standpoint but it’s conceptually important) are defined.

The fact that “source” and “destination” both have two meanings is not a bug but a feature: most of the time, the function that calls `wok.render` and the one that gets called on `wok.request` (and vice versa) is declared in the same module. Wok.js calls such a module “stage” (stage is another one of those words that have conceptual meaning but no clear programatic definition; let’s just say these two functions are defined close to each other in the source code). Most commonly, the words “source” and “destination” are just used to refer to these stages.
 
 * “render” _(v.)_ is the act of passing data from the source to the destination.
 * “request” _(v.)_ is the act of the destination requesting data from the source using a specific “configuration”.
 * “data” _(n.)_ the data passed to the destination.
 * “configuration” _(n.)_ the data passed to the source.

From the point of view of a stage, the following words make more sense:

 * “input” _(n.)_ the pipe going in to a stage (if any). The stage would be the pipe’s “destination”.
 * “output” _(n.)_ the pipe going out of a stage (if any). The stage would be the pipe’s “source”.
 
In the example above, the XMLHttpRequest would not have an input but have an output named “data”, the filter stage would have an input named “data” and an output named “data.filtered” while the rendering stage would have an input named “data.filtered” and no output.
 
## Bootstrapping Wok.js

The globally-exported `window.Wok` function is a constructor using which individual Wok.js instances (the documentation uses `wok` as opposed to `Wok` to refer to these instances) can be created. You can have as many wok instances as you like and they can each be bound to some or all or no parts of the DOM for use with plugins.

```javascript
(function() {
	// A global Wok instance
	var wok = window.wok = new Wok();
	// Optional: turn on debug output
	if(document.location.hash === '#debug') {
		wok.debug = true;
	}
	// Register plugins between now and when wok.init is called
	…
	document.addEventListener('DOMContentLoaded', function() {
		// Search the entire document for uses of the plugins we just registered
		wok.init(document.documentElement);
	}, false);
})();
```
You only have to call `init` if you have any plugins to initialize. Currently, calling `init` multiple times with the same DOM node (or parts of the same tree), will initialize the plugins multiple times, possibly leading to unexpected results. This will likely change in a future release.

### Configuration

The call to `new Wok()` takes as optional argument an object of options. The following options exist.

#### pluginClass

Defaults to `"wok-"`. Each element registered with a plugin gets the name of that plugin prefixed by this option added to the list of class names. For example, if an element uses the plugin `source` and this option is `"wok-"`, the element gets a class name of “wok-source”. Use `null` for the pluginClass to avoid outputting class names.

#### pluginPrefix

Defaults to `"wok-"`. The prefix to search for in data attributes on which plugins to use for a given element. For example, if this option is set to `"wok-"`, elements with an attribute of “data-wok-source” are set up for the “source” plugin.

## Using plugins

To add a registered plugin (`wok.use` registers a plugin) to an element in the DOM, add an attribute called “data-wok-pluginName” (see above). The plugin callback function will then be executed for this element. The value of the data attribute specifies which input and output pipes to use in the following format:

	inputPipe/outputPipe/pluginOptions

If no plugin options are necessary, the syntax is as follows:

	inputPipe/outputPipe

If a plugin does not use both input and output pipes (most don’t), leave the corresponding name empty:

	/outputPipe/pluginOptions

or

	inputPipe//pluginOptions

`pluginOptions` are comma-separated, JSON-encoded arguments that are being passed to the plugin instance.

### Example

The following is an example of an element being set up for the `filter` plugin, using both input and output pipes.

```html
<div data-wok-filter='data/data.filtered/{"fields": ["name", "email", "address"]},"session"'>
 …
</div>
```
The filter plugin callback will be provided with connections to the input pipe “data” and the output pipe “data.filtered”, Additionally, the following arguments get passed:

```javascript
element,
{
	fields: ["name", "email", "address"]
},
"session"
```
The first argument to the function is always the DOM node on which the data attribute is defined.

## API

### Low-level API: `provide` and `subscribe`, `request` and `render`

The most fundamental part of a Wok.js pipe is the provider, the function that listens to request on a pipe (and hopefully responds with `wok.render`). To register a provider for a pipe, use `wok.provide`:

```javascript
wok.provide(pipeName, function provider(configuration…) {}, replace);
```

`provider` will be the function that is called whenever the configuration for this pipe changes and indicates to the source that it should call `wok.render` with updated data. Remember when I said above that each pipe can only have one source? What I actually meant was: there can only be one provider per pipe. If you want to call `wok.provide` multiple times for the same pipe in order to replace the previous provider, set the `replace` argument to `true`.

To register a function that displays data, use `wok.subscribe`:

```javascript
wok.subscribe(pipeName, function subscriber(data…) {});
```

Whenever a pipe gets rendered, the `subscriber` gets called with the updated data. The idea is for the subscriber to either display the data or pass a modified version on to a different pipe.

As you might have noticed, both provider and subscriber can accept multiple arguments. The way data and configuration is structured is completely up to the implementation. It makes sense, however, to use immutable values and to agree not to mutate arrays and objects. Often times, the configuration is also passed to a subscriber so that the subscriber knows how this particular data is configured.

To actually request new data from the provider, call `wok.request`:

```javascript
wok.request(pipeName, configuration…);
```

When the provider has processed the request and is ready with the configured data, it needs to call `wok.render`:

```javascript
wok.render(pipeName, data…);
```

This then gets passed to all subscribers.

### Mid-level API: `register`

Unifying these concepts of subscribers and providers is the “stage”. A stage has at least and input or an output pipe but can have both. calling `wok.register` is a means of making sure you are set up with the correct callbacks:

```javascript
wok.register({
	input: [pipeName, subscriber],
	output: [pipeName, provider]
});
```

This will return an object (the “stage”) with the following properties:

```javascript
{
	wok,      // The Wok.js instance
	request,  // Call this to request data from the input pipe, optionally passing configuration options
	render    // Render data to the output pipe
}
```

### High-level API: Writing plugins with `use`

Like I said earlier: plugins are a means of unifying the concepts of pipes with the DOM. To register a plugin, use `wok.use`:

```javascript
wok.use(pluginName, function plugin(element, options…) {});
```

The `plugin` function is at the heart of this: it gets invoked with the `this` object pointing to the stage that is configured using the pipe names found in the DOM element’s data-attribute “data-wok-pluginName” (where the “wok-” prefix is configurable) and must return an object with callbacks:

```javascript
{
	request: function request(configuration…),  // If the plugin has an output pipe, this callback should provide the data for it
	render: function render(data…)              // If the plugin has an input pipe, this callback should render the data on it
}
```
Either `render` (or `request`) can be omitted, making this plugin input-only (or output-only). If the plugin only has one pipe, the unused property can also be set to a boolean to request or render the pipe as soon as possible (but without any data or configuration). This is mostly used from the bottom up so that input-only plugins add `request: true` to this object in order to get data as soon as the Wok.js instance is ready.

Let’s show an example plugin that dumps the data on a pipe into a DOM element:

```javascript
wok.use('debug', function debug(element, separator) {
	// Set up options
	separator = separator || "\n";
	// Set up the element
	element.style.whiteSpace = 'pre';
	element.textContent = '';
	// Store the controls in a variable
	var controls = this;

	function render(data) {
		element.textContent += separator+JSON.stringify(data);
	}
	
	element.addEventListener('keypress', function(event) {
		if(event.charCode === 0) {
			return;
		}
		// Request from the source.
		// Remember, the format of the configuration is up to the implementation.
		// For this example, we simply chose two parameters.
		// The pipe’s provider will have to support this format.
		controls.request('character', String.fromCharCode(event.charCode));
		// Do not insert the typed character
		event.preventDefault();
	}, false);

	return {
		render: render
	}
});
```

You can now use this plugin as follows:

```html
<textarea data-wok-debug='inputPipeName//"\n-------------\n"'>
</textarea>
```

Which will configure the separator to be `"\n-------------\n"`.

Alternatively, plugins can be assigned to the global `Wok.plugins` object and then registered using just their name only. This is the way third-party plugins are registered:

```javascript
Wok.plugins.debug = function debug(element, separator) {};
…
wok = new Wok();
wok.use("debug"); // Same as wok.use("debug, Wok.plugins.debug);
wok.init();
```

To alias an existing plugin, use two strings. This way, the same plugin can be used multiple times on the same element (or using a nicer name):

```javascript
wok.use("test", function() …);
wok.use("test2", "test");
```

## Installation

Install via npm:

	npm install --save wok

## Building Wok.js

Prerequisites:

	npm install -g gulp
	npm install

Minify into `dist/`:

	gulp build

Run tests:

	gulp test

## License

I’ve always loved the GPL for its “viral” nature, its ability to force software interoperating with GPL-licensed parts to become “infected” as well but for some reason I’ve never put my own software under the GPL, so I’m trying something new with this project. Since the GPL (unlike the LGPL) has very strict rules about linking, any software using Wok.js will fall under the GPL as well. Most likely this will mean people will want to switch to a different library. If that’s the case, it’s fine with me. If you seek to use Wok.js under a different license, feel free to contact me directly, maybe we can work something out. For contributors this means all contributions you make will be GPL but copyright be transferred to me in order for me to re-license to interested parties.

Copyright (C) 2015 Raphael Schweikert

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software Foundation,
Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software Foundation,
Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
