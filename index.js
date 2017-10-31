//----------------------------------------------------------------------------------
// Microsoft Developer & Platform Evangelism
//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// THIS CODE AND INFORMATION ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, 
// EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES 
// OF MERCHANTABILITY AND/OR FITNESS FOR A PARTICULAR PURPOSE.
//----------------------------------------------------------------------------------
// The example companies, organizations, products, domain names,
// e-mail addresses, logos, people, places, and events depicted
// herein are fictitious.  No association with any real company,
// organization, product, domain name, email address, logo, person,
// places, or events is intended or should be inferred.
//----------------------------------------------------------------------------------

var fs = require('fs');
var path = require('path');
var readlineSync = require('readline-sync');
var storage = require('azure-storage');
var util = require('util');
var uuid = require('uuid');

// Create a blob client for interacting with the blob service from connection string
// How to create a storage connection string - http://msdn.microsoft.com/en-us/library/azure/ee758697.aspx
var connectionString = 'AzureStorageConnectionString';
var blobService = storage.createBlobService(connectionString);

// Azure Storage Node.js Client Library doesn't provide promise APIs currently
// bluebird helps transforming callback style methods to support promise
// The promisified method name will be the original method name suffixed with suffix "Async"
// Refer to http://bluebirdjs.com/docs/api/promise.promisifyall.html
var Promise = require('bluebird');
Promise.promisifyAll(blobService);

// Prepare upload and download file path related variables
var LOCAL_FILE_TO_UPLOAD = 'HelloWorld-' + uuid.v1() + '.txt';
var DOWNLOADED_FILE_NAME = LOCAL_FILE_TO_UPLOAD.replace('.txt', '_DOWNLOADED.txt');
var USER_HOME = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var DOCUMENT_FOLDER = path.join(USER_HOME, 'Documents');
var LOCAL_FILE_PATH = path.join(DOCUMENT_FOLDER, LOCAL_FILE_TO_UPLOAD);
var DOWNLOADED_FILE_PATH = path.join(DOCUMENT_FOLDER, DOWNLOADED_FILE_NAME);
var CONTAINER_NAME = 'quickstartblobs-' + uuid.v1();
var BLOCK_BLOB_NAME = 'demoblockblob-' + LOCAL_FILE_TO_UPLOAD;
if (!fs.existsSync(DOCUMENT_FOLDER)) { fs.mkdirSync(DOCUMENT_FOLDER); }

console.log('Azure Storage Node.js Client Library Blobs Quick Start\n');

console.log('1. Creating a container with public access:', CONTAINER_NAME, '\n');
blobService.createContainerIfNotExistsAsync(CONTAINER_NAME, { 'publicAccessLevel': 'blob' }).then(function () {
    console.log('2. Creating a file in ~/Documents folder to test the upload and download\n');
    console.log('   Local File:', LOCAL_FILE_PATH, '\n');
    fs.writeFileSync(LOCAL_FILE_PATH, 'Greetings from Microsoft!');
}).then(function () {
    console.log('3. Uploading BlockBlob:', BLOCK_BLOB_NAME, '\n');
    console.log('   Uploaded Blob URL:', blobService.getUrl(CONTAINER_NAME, BLOCK_BLOB_NAME), '\n');
    return blobService.createBlockBlobFromLocalFileAsync(CONTAINER_NAME, BLOCK_BLOB_NAME, LOCAL_FILE_PATH);
}).then(function () {
    console.log('4. Listing blobs in container\n');
    return blobService.listBlobsSegmentedAsync(CONTAINER_NAME, null);
}).then(function (data) {
    for (var i = 0; i < data.entries.length; i++) {
        console.log(util.format('   - %s (type: %s)'), data.entries[i].name, data.entries[i].blobType);
    }
    console.log('\n');
}).then(function () {
    console.log('5. Downloading blob\n');
    console.log('   Downloaded File:', DOWNLOADED_FILE_PATH, '\n');
    return blobService.getBlobToLocalFileAsync(CONTAINER_NAME, BLOCK_BLOB_NAME, DOWNLOADED_FILE_PATH);
}).then(function () {
    console.log('Sample finished running. When you hit <ENTER> key, the temporary files will be deleted and the sample application will exit.');
    readlineSync.question('\n');
}).then(function () {
    console.log('6. Deleting block Blob\n');
    return blobService.deleteBlobIfExistsAsync(CONTAINER_NAME, BLOCK_BLOB_NAME);
}).then(function () {
    console.log('7. Deleting container\n');
    return blobService.deleteContainerIfExistsAsync(CONTAINER_NAME);
}).then(function () {
    fs.unlinkSync(LOCAL_FILE_PATH);
    fs.unlinkSync(DOWNLOADED_FILE_PATH);
}).catch(function (e) {
    console.error('Exception thrown:\n', e);
});