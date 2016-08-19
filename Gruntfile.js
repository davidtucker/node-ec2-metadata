module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    nodeunit: {
      tests: ['test/*_test.js']
    },
    jshint: {
      all: ['Gruntfile.js', 'server.js', 'lib/**/*.js', 'test/**/*.js'],
      options: {
        reporterOutput: ""
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.registerTask('test', ['jshint', 'nodeunit']);

};
