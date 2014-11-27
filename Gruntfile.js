module.exports = function (grunt) {

    grunt.initConfig({
        jasmine: {
            app: {
                src: 'src/**/*.js',
                options: {
                    specs: 'test/spec/*Spec.js',
                    vendor: ['bower_components/sugar/release/sugar.min.js']
                }
            }
        },
        watch: {
            options: {
                livereload: 3500
            },
            files: ['src/**/*.js', 'test/spec/*Spec.js'],
            tasks: ['jasmine:app']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('default', ['jasmine:app', 'watch']);

};
