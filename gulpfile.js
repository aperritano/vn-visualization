'use strict';


// include gulp
var gulp = require('gulp');

// include plug-ins
var jshint = require('gulp-jshint');
var changed = require('gulp-changed');
var livereload = require('gulp-livereload');
var browserSync = require('browser-sync');
var reload = browserSync.reload;


// JS hint task
gulp.task('jshint', function() {
    gulp.src('./app/scripts/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});


gulp.task('watch-jslinter', ['jshint'], function() {
    // watch for JS changes
    gulp.watch('./app/scripts/*.js', ['jshint']);
    // watch for html changes

});

gulp.task('watch', ['server'], function() {
    livereload.listen({ basePath: 'app' });
    gulp.watch('./app/styles/*.css', ['jshint']);
    gulp.watch('./app/scripts/*.js', ['jshint']);
    gulp.watch('./app/*.html');
});

//gulp.task('browser-sync', function () {
//    var files = [
//        'app/*.html',
//        'app/styles/*.css',
//        'app/images/*.*',
//        'app/scripts/*.js'
//    ];
//
//    browserSync.init(files, {
//        server: {
//            baseDir: './app'
//        }
//    });
//});

// Watch files for changes & reload
gulp.task('serve', ['jshint'], function () {
    browserSync({
        port: 5000,
        notify: false,
        logPrefix: 'VN',
        snippetOptions: {
            rule: {
                match: '<span id="browser-sync-binding"></span>',
                fn: function (snippet) {
                    return snippet;
                }
            }
        },
        // Run as an https by uncommenting 'https: true'
        // Note: this uses an unsigned certificate which on first access
        //       will present a certificate warning in the browser.
        // https: true,
        server: {
            baseDir: ['app'],
            routes: {
                '/bower_components': 'bower_components',
                '/node_modules': 'node_modules'
            }
        }
    });

    gulp.watch(['app/**/*.html'], reload);
    gulp.watch(['app/styles/**/*.css'], ['styles', reload]);
    gulp.watch(['app/elements/**/*.css'], ['elements', reload]);
    gulp.watch(['app/{scripts}/**/{*.js}'], ['jshint']);
    gulp.watch(['app/images/**/*'], reload);
});