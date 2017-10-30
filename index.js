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
var guid = require('uuid');
var storage = require('azure-storage');
var path = require('path');
var util = require('util');

// Create a blob client for interacting with the blob service from connection string
// How to create a storage connection string - http://msdn.microsoft.com/en-us/library/azure/ee758697.aspx
var connectionString = 'AzureStorageConnectionString';
var blobService = storage.createBlobService(connectionString);

var blockBlobContainerName = 'quickstartblobs-' + guid.v1();
var localFileToUpload = 'HelloWorld-' + guid.v1() + '.txt';
var blockBlobName = 'demoblockblob-' + localFileToUpload;
var downloadedFileName = localFileToUpload.replace('.txt', '_DOWNLOADED.txt');

var USER_HOME = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var DOCUMENT_FOLDER = path.join(USER_HOME, 'Documents');
if (!fs.existsSync(DOCUMENT_FOLDER)) { fs.mkdirSync(DOCUMENT_FOLDER); }

console.log('Azure Storage Node.js Client Library Blobs Quick Start\n');

// Create a container for organizing blobs within the storage account.
console.log('1. Creating a Container with Public Access:', blockBlobContainerName, '\n');
blobService.createContainerIfNotExists(blockBlobContainerName, { 'publicAccessLevel': 'blob' }, function (error) {
    if (error) return callback(error);

    // Create a file in ~/Documents to test the upload and download
    console.log('2. Creating a file in Documents to test the upload and download\n');
    var localPath = path.join(DOCUMENT_FOLDER, localFileToUpload);

    console.log('Local File:', localPath, '\n');
    fs.writeFileSync(localPath, 'Greetings from Microsoft!');

    // Upload a BlockBlob to the newly created container
    console.log('3. Uploading BlockBlob: ', blockBlobName, '\n');
    blobService.createBlockBlobFromLocalFile(blockBlobContainerName, blockBlobName, localPath, function (error) {
        if (error) return callback(error);
        console.log('Uploaded blob URL:', blobService.getUrl(blockBlobContainerName, blockBlobName), '\n');

        // List all the blobs in the container
        console.log('4. Listing Blobs in Container\n');
        listBlobs(blobService, blockBlobContainerName, null, null, null, function (error, results) {
            if (error) return callback(error);

            for (var i = 0; i < results.length; i++) {
                console.log(util.format('   - %s (type: %s)'), results[i].name, results[i].blobType);
            }
            console.log('\n');

            // Download a blob to your file system
            console.log('5. Downloading Blob\n');

            var downloadPath = path.join(DOCUMENT_FOLDER, downloadedFileName);
            console.log('Downloaded File:', downloadPath, '\n');

            blobService.getBlobToLocalFile(blockBlobContainerName, blockBlobName, downloadPath, function (error) {
                if (error) return callback(error);

                // Create a read-only snapshot of the blob
                console.log('6. Creating a read-only snapshot of the blob\n');
                blobService.createBlobSnapshot(blockBlobContainerName, blockBlobName, function (error, snapshotId) {
                    if (error) return callback(error);
                    console.log('snapshotId:', snapshotId, '\n');

                    console.log('Sample finished running. When you hit <ENTER> key, the temporary files will be deleted and the sample application will exit.\n');
                    process.stdin.once('data', function() {
                        // Clean up after the demo. Deleting blobs are not necessary if you also delete the container. The code below simply shows how to do that.
                        console.log('7. Deleting block Blob and all of its snapshots\n');
                        var deleteOption = { deleteSnapshots: storage.BlobUtilities.SnapshotDeleteOptions.BLOB_AND_SNAPSHOTS };
                        blobService.deleteBlob(blockBlobContainerName, blockBlobName, deleteOption, function (error) {
                            try { fs.unlinkSync(downloadedImageName); } catch (e) { }
                            if (error) return callback(error);

                            // Delete the container
                            console.log('8. Deleting Container\n');
                            blobService.deleteContainerIfExists(blockBlobContainerName, function (error) {
                                if (error) return callback(error);

                                // Delete local files
                                fs.unlinkSync(localPath);
                                fs.unlinkSync(downloadPath);

                                console.log('Press <ENTER> key to exit.');
                                process.stdin.end();                    
                            });
                        });
                    });
                });
            });
        });
    });
});

/**
* Lists blobs in the container.
* @ignore
*
* @param {BlobService}        blobService                         The blob service client.
* @param {string}             container                           The container name.
* @param {object}             token                               A continuation token returned by a previous listing operation. 
*                                                                 Please use 'null' or 'undefined' if this is the first operation.
* @param {object}             [options]                           The request options.
* @param {int}                [options.maxResults]                Specifies the maximum number of directories to return per call to Azure ServiceClient. 
*                                                                 This does NOT affect list size returned by this function. (maximum: 5000)
* @param {LocationMode}       [options.locationMode]              Specifies the location mode used to decide which location the request should be sent to. 
*                                                                 Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]       The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]  The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                 The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                 execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]           A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]         Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                 The default value is false.
* @param {errorOrResult}      callback                            `error` will contain information
*                                                                 if an error occurs; otherwise `result` will contain `entries` and `continuationToken`. 
*                                                                 `entries`  gives a list of directories and the `continuationToken` is used for the next listing operation.
*                                                                 `response` will contain information related to this operation.
*/
function listBlobs(blobService, container, token, options, blobs, callback) {
    blobs = blobs || [];

    blobService.listBlobsSegmented(container, token, options, function (error, result) {
        if (error) return callback(error);

        blobs.push.apply(blobs, result.entries);
        var token = result.continuationToken;
        if (token) {
            console.log('   Received a segment of results. There are(is) ' + result.entries.length + ' blob(s) on this segment.');
            listBlobs(blobService, container, token, options, blobs, callback);
        } else {
            console.log('   Completed listing. There is(are) ' + blobs.length + ' blob(s).');
            callback(null, blobs);
        }
    });
}

function callback(error) {
    console.error('Some error happended:\n', error);
}