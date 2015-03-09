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
	});
})(window.jasmine, window.Wok);
