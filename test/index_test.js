var metadata = require('../lib/index');
var _ = require('lodash');

exports.replaceValuesForType = {

    testNoStringReplacement: function (test) {
        test.equal('ami-id', metadata.replaceValuesForType('ami-id'));
        test.equal('ami-manifest-path', metadata.replaceValuesForType('ami-manifest-path'));
        test.done();
    },

    testSingleArgStringReplacement: function (test) {
        test.equal('block-device-mapping/ebs1', metadata.replaceValuesForType('block-device-mapping/ebsN', [1]));
        test.done();
    },

    testMultipleArgStringReplacement: function (test) {
        var args = [ '01-23-45-67-89-ab', '123.234.345.456' ];
        var result = 'network/interfaces/macs/01-23-45-67-89-ab/ipv4-associations/123.234.345.456';
        test.equal(result, metadata.replaceValuesForType('network/interfaces/macs/mac/ipv4-associations/public-ip', args));
        test.done();
    },

    testIncorrectNumberOfArguments: function(test) {
        test.throws(function() {
            metadata.replaceValuesForType('block-device-mapping/ebsN');
        }, Error, 'Incorrect Number of Arguments for Type');
        test.done();
    }

};

exports.urlForType = {

    testArgumentsURL: function(test) {
        var args = [ '01-23-45-67-89-ab', '123.234.345.456' ];
        var resultURL = 'http://169.254.169.254/latest/meta-data/network/interfaces/macs/01-23-45-67-89-ab/ipv4-associations/123.234.345.456';
        test.equal(metadata.urlForType('network/interfaces/macs/mac/ipv4-associations/public-ip', args), resultURL);
            test.done();
    },

    testDynamicNoArgs: function(test) {
        var result = 'http://169.254.169.254/latest/dynamic/fws/instance-monitoring';
        test.equal(metadata.urlForType('fws/instance-monitoring'), result);
        test.done();
    },

    testMetadataNoArgs: function(test) {
        var result = 'http://169.254.169.254/latest/meta-data/local-hostname';
        test.equal(metadata.urlForType('local-hostname'), result);
        test.done();
    },

    testInvalidType: function(test) {
        test.throws(function() {
            metadata.urlForType('invalid/metadata');
        }, Error, 'Not a valid EC2 metadata type');
        test.done();
    }

};