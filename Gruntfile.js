/*jslint node:true */
module.exports = function (grunt) {
  'use strict';
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    // Configure a mochaTest task
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          quiet: false
        },
        src: ['test/**.js']
      }
    },
    jshint: {
      all: ['Gruntfile.js', 'rappor.js', 'analysis/**.js', 'test/**.js']
    }
  });

  // Add the grunt-mocha-test tasks.
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('test', ['jshint', 'mochaTest']);
  grunt.registerTask('default', ['jshint', 'mochaTest']);
};
