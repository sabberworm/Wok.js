var gulp = require('gulp');
var karma = require('karma').server;
var del = require('del');
var stylish = require('jshint-stylish');

var p = require('gulp-load-plugins')();

gulp.task('clean', function(cb) {
  del(['build'], cb);
});

gulp.task('check', function() {
	return gulp.src([
		'src/*.js',
		'test/*.js'
	]).pipe(
		p.jshint()
	).pipe(
		p.jshint.reporter(stylish)
	)
});

gulp.task('test', ['check'], function (done) {
	karma.start({
		configFile: __dirname + '/karma.conf.js',
		singleRun: true
	}, done);
});

gulp.task('minify', ['check'], function() {
	return gulp.src(
		'src/*.js'
	).pipe(
		p.sourcemaps.init({
			includeContent: true
		})
	).pipe(
		p.uglify()
	).pipe(
		p.rename({suffix: '.min'})
	).pipe(
		p.sourcemaps.write('./')
	).pipe(gulp.dest('build'));
});

gulp.task('watch-test', ['test'], function() {
	gulp.watch('test/*.js', ['test']);
});

gulp.task('watch', ['watch-test']);

gulp.task('build', ['minify']);

gulp.task('default', ['test', 'build']);