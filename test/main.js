// jshint jasmine: true
(function(jasmine, Wok) {
	'use strict';

	describe('Wok', function() {
		var wok;
		beforeEach(function() {
			wok = new Wok();
		});
	
		it('provides', function() {
			var provider = jasmine.createSpy('provider');
			wok.provide('testPipe', provider);
			expect(provider).not.toHaveBeenCalled();
			wok.request('testPipe', 'a', 'test');
			expect(provider).toHaveBeenCalledWith('a', 'test');
		});

		it('subscribes', function() {
			var subscriber = jasmine.createSpy('subscriber');
			wok.subscribe('testPipe', subscriber);
			expect(subscriber).not.toHaveBeenCalled();
			wok.render('testPipe', 'a', 'test');
			expect(subscriber).toHaveBeenCalledWith('a', 'test');
		});

		it('makes it impossible to have multiple proviers', function() {
			var provider1 = function() {};
			var provider2 = function() {};
			wok.provide('testPipe', provider1);
			expect(function() {
				wok.provide('testPipe', provider2);
			}).toThrowError('Cannot replace defined pipe “testPipe”’s source');
		});

		it('sends renders to all subscribers', function() {
			var subscriber1 = jasmine.createSpy('subscriber1');
			wok.subscribe('testPipe', subscriber1);
			var subscriber2 = jasmine.createSpy('subscriber2');
			wok.subscribe('testPipe', subscriber2);
			wok.render('testPipe', 'a', 'test');
			expect(subscriber1).toHaveBeenCalledWith('a', 'test');
			expect(subscriber2).toHaveBeenCalledWith('a', 'test');
		});
	});
	
	describe('A Wok plugin', function() {
		var wok;
		beforeEach(function() {
			Wok.plugins = {};
			wok = new Wok();
		});

		it('can be assigned', function() {
			Wok.plugins.test = function() {};
			expect(function() {
				wok.use('test');
			}).not.toThrow();
			expect(function() {
				wok.use('tests');
			}).toThrowError('Plugin tests not known to Wok.');
		});

		it('initializes itself', function() {
			var test1 = jasmine.createSpy('test1').and.returnValue({render: function() {}});
			wok.use('test1', test1);
			var test2 = jasmine.createSpy('test2').and.returnValue({render: function() {}});
			wok.use('test2', test2);
			var element = document.createElement('div');
			element.innerHTML = '<div data-wok-test1></div><div data-wok-test1="input//1"></div>';
			var divs = element.children;
			wok.init(element);
			expect(test2).not.toHaveBeenCalled();
			expect(test1).toHaveBeenCalledWith(divs[0]);
			expect(test1).toHaveBeenCalledWith(divs[1], 1);
		});

		it('knows its pipes', function() {
			var test = jasmine.createSpy('test').and.callFake(function() {
				expect(this.inputName).toBe('inputPipe');
				expect(this.outputName).toBe('outputPipe');
				return {
					render: function() {},
					request: function() {}
				};
			});
			wok.use('test', test);
			var element = document.createElement('div');
			element.innerHTML = '<div data-wok-test="inputPipe/outputPipe"></div>';
			wok.init(element);
			expect(test).toHaveBeenCalled();
		});

		it('does not accept output pipes if input-only', function() {
			wok.use('inputOnly', function() {
				return {
					render: function() {}
				};
			});
			var element = document.createElement('div');
			element.innerHTML = '<div data-wok-inputOnly="inputPipe/outputPipe"></div>';
			expect(function() {
				wok.init(element);
			}).toThrowError('Wok plugin “inputOnly” not meant to be used with output pipes');
		});

		it('does not accept input pipes if output-only', function() {
			wok.use('outputOnly', function() {
				return {
					request: function() {}
				};
			});
			var element = document.createElement('div');
			element.innerHTML = '<div data-wok-outputOnly="inputPipe/outputPipe"></div>';
			expect(function() {
				wok.init(element);
			}).toThrowError('Wok plugin “outputOnly” not meant to be used with input pipes');
		});
	});
})(window.jasmine, window.Wok);
