/*

    This module is designed to wrap the EC2 metadata gathering process.  AWS provides
    an endpoint that you can hit to get specific metadata values.

    You can see the AWS metadata documentation here:
    http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AESDG-chapter-instancedata.html

 */
var Q = require('q');
var _ = require('lodash');
var dns = require('dns');
var http = require('http');
var url = require('url');

/*
    Endpoint Configuration
 */
var BASE_URL = 'http://169.254.169.254/latest/';
var METADATA_ENDPOINT = 'meta-data/';
var DYNAMIC_ENDPOINT = 'dynamic/';

/*
    Allowed data types for the metadata endpoint
 */
var ALLOWED_METADATA_VALUES = [
    'ami-id',
    'ami-launch-index',
    'ami-manifest-path',
    'ancestor-ami-ids',
    'block-device-mapping/ami',
    'block-device-mapping/ebsN',
    'block-device-mapping/ephemeralN',
    'block-device-mapping/root',
    'block-device-mapping/swap',
    'hostname',
    'iam/info',
    'iam/security-credentials/role-name',
    'instance-action',
    'instance-id',
    'instance-type',
    'kernel-id',
    'local-hostname',
    'local-ipv4',
    'mac',
    'network/interfaces/macs/mac/device-number',
    'network/interfaces/macs/mac/ipv4-associations/public-ip',
    'network/interfaces/macs/mac/local-hostname',
    'network/interfaces/macs/mac/local-ipv4s',
    'network/interfaces/macs/mac/mac',
    'network/interfaces/macs/mac/owner-id',
    'network/interfaces/macs/mac/public-hostname',
    'network/interfaces/macs/mac/public-ipv4s',
    'network/interfaces/macs/mac/security-groups',
    'network/interfaces/macs/mac/security-group-ids',
    'network/interfaces/macs/mac/subnet-id',
    'network/interfaces/macs/mac/subnet-ipv4-cidr-block',
    'network/interfaces/macs/mac/vpc-id',
    'network/interfaces/macs/mac/vpc-ipv4-cidr-block',
    'placement/availability-zone',
    'product-codes',
    'public-hostname',
    'public-ipv4',
    'public-keys/0/openssh-key',
    'ramdisk-id',
    'reservation-id',
    'security-groups',
    'services/domain'
];

/*
    Allowed data types for the dynamic endpoint
 */
var ALLOWED_DYNAMIC_VALUES = [
    'fws/instance-monitoring',
    'instance-identity/document',
    'instance-identity/pkcs7',
    'instance-identity/signature'
];

/*
    All allowed data types
 */
var ALLOWED_TYPES = _.union(ALLOWED_METADATA_VALUES, ALLOWED_DYNAMIC_VALUES);

/*
    Argument count for data types which require arguments
 */
var REQUIRED_ARGUMENT_COUNT = {
    'block-device-mapping/ebsN' : 1,
    'block-device-mapping/ephemeralN' : 1,
    'iam/security-credentials/role-name' : 1,
    'network/interfaces/macs/mac/device-number' : 1,
    'network/interfaces/macs/mac/ipv4-associations/public-ip' : 2,
    'network/interfaces/macs/mac/local-hostname' : 1,
    'network/interfaces/macs/mac/local-ipv4s' : 1,
    'network/interfaces/macs/mac/mac' : 1,
    'network/interfaces/macs/mac/owner-id' : 1,
    'network/interfaces/macs/mac/public-hostname' : 1,
    'network/interfaces/macs/mac/public-ipv4s' : 1,
    'network/interfaces/macs/mac/security-groups' : 1,
    'network/interfaces/macs/mac/security-group-ids' : 1,
    'network/interfaces/macs/mac/subnet-id' : 1,
    'network/interfaces/macs/mac/subnet-ipv4-cidr-block' : 1,
    'network/interfaces/macs/mac/vpc-id' : 1,
    'network/interfaces/macs/mac/vpc-ipv4-cidr-block' : 1
};

/*
    The replacement strings used to populate the URL value for data types
    which require one or more arguments.
 */
var REPLACEMENT_STRINGS = {
    'block-device-mapping/ebsN' : 'block-device-mapping/ebs%1',
    'block-device-mapping/ephemeralN' : 'block-device-mapping/ephemeral%1',
    'iam/security-credentials/role-name' : 'iam/security-credentials/%1',
    'network/interfaces/macs/mac/device-number' : 'network/interfaces/macs/%1/device-number',
    'network/interfaces/macs/mac/ipv4-associations/public-ip' : 'network/interfaces/macs/%1/ipv4-associations/%2',
    'network/interfaces/macs/mac/local-hostname' : 'network/interfaces/macs/%1/local-hostname',
    'network/interfaces/macs/mac/local-ipv4s' : 'network/interfaces/macs/%1/local-ipv4s',
    'network/interfaces/macs/mac/mac' : 'network/interfaces/macs/%1/mac',
    'network/interfaces/macs/mac/owner-id' : 'network/interfaces/macs/%1/owner-id',
    'network/interfaces/macs/mac/public-hostname' : 'network/interfaces/macs/%1/public-hostname',
    'network/interfaces/macs/mac/public-ipv4s' : 'network/interfaces/macs/%1/public-ipv4s',
    'network/interfaces/macs/mac/security-groups' : 'network/interfaces/macs/%1/security-groups',
    'network/interfaces/macs/mac/security-group-ids' : 'network/interfaces/macs/%1/security-group-ids',
    'network/interfaces/macs/mac/subnet-id' : 'network/interfaces/macs/%1/subnet-id',
    'network/interfaces/macs/mac/subnet-ipv4-cidr-block' : 'network/interfaces/macs/%1/subnet-ipv4-cidr-block',
    'network/interfaces/macs/mac/vpc-id' : 'network/interfaces/macs/%1/vpc-id',
    'network/interfaces/macs/mac/vpc-ipv4-cidr-block' : 'network/interfaces/macs/%1/vpc-ipv4-cidr-block'
};



var isAllowedType = function(type) {
    return _.contains(ALLOWED_TYPES, type);
};

var fetchDataForURL = function(url) {
    var deferred = Q.defer();
    var req = http.get(url, function(res) {
        res.setEncoding('utf8');
        var result = "";
        res.on('data', function(chunk) {
            result += chunk;
        });
        res.on('end', function() {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                deferred.resolve(result);
            } else if (res.statusCode == 404) {
                // return null for 404 responses - we already know it's a valid request
                // eg. public-ipv4 of a VPC instance without one
                deferred.resolve(null);
            } else {
                var e = new Error(result);
                e.code = res.statusCode;
                deferred.reject(e);
            }
        });
    });
    req.setTimeout( 2500, function() {
        deferred.reject(new Error('EC2-Metadata Fetch Timeout.'));
        req.abort();
    });
    req.on('error', function(e) {
        deferred.reject(e);
    });
    return deferred.promise;
};

var urlForType = function(type, args) {
    if(!isAllowedType(type)) {
        throw new Error('Not a valid EC2 metadata type');
    }

    var url = "";
    if(_.contains(ALLOWED_METADATA_VALUES, type)) {
        url = BASE_URL + METADATA_ENDPOINT + replaceValuesForType(type, args);
    } else if(_.contains(ALLOWED_DYNAMIC_VALUES, type)) {
        url = BASE_URL + DYNAMIC_ENDPOINT + replaceValuesForType(type, args);
    }

    return url;
};

var replaceValuesForType = function(type, args) {
    if(REPLACEMENT_STRINGS.hasOwnProperty(type)) {
        var requiredArgCount = REQUIRED_ARGUMENT_COUNT[type] || 0;
        if(((requiredArgCount > 0) && !args) || args.length != requiredArgCount) {
            throw new Error('Incorrect Number of Arguments for Type');
        }
        var replacementString = REPLACEMENT_STRINGS[type];
        var numArgs = REQUIRED_ARGUMENT_COUNT[type];
        for(var i = 0; i < numArgs; i++) {
            var argReplacementString = "%" + (i + 1);
            replacementString = replacementString.replace(argReplacementString, args[i]);
        }
        return replacementString;
    } else {
        return type;
    }
};

var getMetadataForInstance = function(type, args) {
    if(_.indexOf(ALLOWED_TYPES,type) < 0) {
        var deferred = Q.defer();
        deferred.reject("Not a valid metadata type");
        return deferred.promise;
    }

    var url = urlForType(type, args);
    return fetchDataForURL(url);
};

var isEC2 = function() {
    // the host running the process won't change, so we can cache this value
    if (isEC2._cached !== undefined) {
        return Q(isEC2._cached);
    }

    var deferred = Q.defer();
    var promise = deferred.promise.then(function setCache(value) {
        isEC2._cached = value;
        return value;
    });

    // first try to resolve ec2 internal metadata. This doesn't work with VPC or custom DNS though.
    dns.lookup('instance-data.ec2.internal.', function dnsResult(err, result) {
        if (result == '169.254.169.254') {
            deferred.resolve(true);
        } else {
            // next do a HEAD query to 'http://169.254.169.254/latest/' with a short timeout
            var reqOpts = _.assign(url.parse(BASE_URL), {method: 'HEAD'});
            var req = http.request(reqOpts, function httpRes(res) {
                deferred.resolve(true);
                req.abort();
            });
            req.setTimeout( 500, function httpTimeout() {
                deferred.resolve(false);
                req.abort();
            });
            req.on('error', function httpErr(e) {
                deferred.resolve(false);
            });
            req.end();
        }
    });
    return promise;
};

/*
    EXPORTS
 */

exports.urlForType = urlForType;
exports.replaceValuesForType = replaceValuesForType;
exports.getMetadataForInstance = getMetadataForInstance;
exports.isEC2 = isEC2;
