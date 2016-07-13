# node-ec2-metadata

This module wraps the functionality around fetching metadata for running EC2 instances.  For more information on the data types that AWS provides for EC2 instances see <a href="http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AESDG-chapter-instancedata.html">Instance Metadata and User Data</a>.

## Install

```
npm install node-ec2-metadata
```

## API

This module exposes a method ```getMetadataForInstance``` which returns a promise.  You can see an example below for fetching the instance ID of a running EC2 instance.  To see the data types that you can call, review <a href="http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AESDG-chapter-instancedata.html">Instance Metadata and User Data</a>. Metadata that doesn't apply to an instance will return `null` values.

```javascript
var metadata = require('node-ec2-metadata');

metadata.getMetadataForInstance('instance-id')
.then(function(instanceId) {
    console.log("Instance ID: " + instanceId);
})
.fail(function(error) {
    console.log("Error: " + error);
});
```

Some metadata types require arguments as well.  The second argument that is passed to the ```getMetadataForInstance``` method is an optional array of arguments.  If you do not pass the correct number of arguments, an Error will be thrown.

```javascript
var metadata = require('node-ec2-metadata');

var args = [ '01-23-45-67-89-ab', '123.234.345.456' ];
metadata.getMetadataForInstance('network/interfaces/macs/mac/ipv4-associations/public-ip', args)
.then(function(privateAddress) {
    console.log("Private IPv4 Address: " + privateAddress);
})
.fail(function(error) {
    console.log("Error: " + error);
});
```

For example, if you need to grab multiple pieces of metadata, you can use a promises module like <a href="https://github.com/kriskowal/q">Q</a> to help grab all of them at once:

```javascript
var metadata = require('node-ec2-metadata');

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
```

The ```isEC2``` method detects whether the code is running on EC2. It returns a promise, where the result will be a boolean. The initial call may take up to 500ms on a non-EC2 host, but the result is cached so subsequent calls provide a result immediately.

```javascript
var metadata = require('node-ec2-metadata');

metadata.isEC2()
.then(function(onEC2) {
    console.log("Running on EC2? " + onEC2);
});
```


## License

The MIT License (MIT)

Copyright (c) 2014 David Tucker

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


