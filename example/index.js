var metadata = require('node-ec2-metadata');
var Q = require('q');

Q.all([
    metadata.getMetadataForInstance('ami-id'),
    metadata.getMetadataForInstance('hostname'),
    metadata.getMetadataForInstance('public-hostname'),
    metadata.getMetadataForInstance('public-ipv4'),
])
.spread(function(amiID, hostname, publicHostname, publicIPv4) {
    console.log("AMI-ID: " + amiID);
    console.log("Hostname: " + hostname);
    console.log("Public Hostname: " + publicHostname);
    console.log("Public IPv4: " + publicIPv4);
})
.fail(function(error) {
    console.log("Error: " + error);
});