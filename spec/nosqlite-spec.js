// spec/nosqlite-spec.js
var libpath = process.env.NOSQLITE_COVERAGE ? '../lib-cov' : '../lib',
    NoSqlite = require(libpath + '/nosqlite'),
    QHelper  = require('./Qhelper'),
    uuid     = require('node-uuid'),
    level    = process.env.NOSQLITE_LEVEL ? process.env.NOSQLITE_LEVEL : 'error';

console.log('Loading ' + libpath + ' libraries');

var testDatabaseImplementation = [
    {name: "Memory" , filename:null},
    {name: "Disk"   , filename:"testdb"}
];

for (var index = 0 ; index < testDatabaseImplementation.length ; ++index) {

    /////////////////////// DATABASE LIFE CYCLE ////////////////////////////

    describe('Testing a ' + testDatabaseImplementation[index].name + ' Database Life cycle', function () {

        var database = new NoSqlite(testDatabaseImplementation[index].filename, {level:level, journal:false});

        // Test out of sycn API calls for Database life cycle
        //
        it('Expect closing an unopenned Database to be rejected', function () {
            QHelper(database.close(), "Waiting for the database to be closed", function (state) {
               expect(state).toBe('rejected');
            });
        });
        it('Expect deleting an unopenned Database to be rejected', function () {
            QHelper(database.delete(), "Waiting for the database to be deleted", function (state) {
               expect(state).toBe('rejected');
            });
        });

        // Normal API calls
        it('Expect openning the Database to succeed', function () {
            QHelper(database.open(), "Waiting for the database to be openned", function (state) {
               expect(state).toBe('fulfilled');
            });
        });

        // Invalid API call
        it('Expect Deleting an openned database to be rejected', function () {
            QHelper(database.delete(), "Waiting for the database to be deleted", function (state) {
               expect(state).toBe('rejected');
            });
        });

        // Back to normal sequence
        it('Expect Closing a Database to succeed', function () {
            QHelper(database.close(), "Waiting for the database to be closed", function (state) {
               expect(state).toBe('fulfilled');
            });
        });
        it('Expect Deleting a closed Database to succeed', function () {
            QHelper(database.delete(), "Waiting for the database to be deleted", function (state) {
               expect(state).toBe('fulfilled');
            });
        });

        // Invalid API call
        it('Expect Deleting an already deleted Database to be rejected', function () {
            QHelper(database.delete(), "Waiting for the database to be deleted", function (state) {
               expect(state).toBe('rejected');
            });
        });

        it('Expect Closing an already closed Database to be rejected', function () {
            QHelper(database.close(), "Waiting for the database to be closed", function (state) {
               expect(state).toBe('rejected');
            });
        });
    });

    /////////////////////// BUCKET LIFE CYCLE ////////////////////////////

    describe('Testing a Bucket Life cycle within a ' + testDatabaseImplementation[index].name + ' Database', function () {

        var database   = new NoSqlite(testDatabaseImplementation[index].filename, {level:level, journal:false});
        var bucketName = 'bilbucket';

        // Out of sequence API Calls
        it('Expect Creating bucket ' + bucketName + ' for an unopenned database to be rejected', function () {
            QHelper(database.create(bucketName), 'Waiting for the bucket creation', function (state, err, bucket) {
               expect(state).toBe('rejected');
               expect(err).not.toBeNull();
               expect(bucket).toBeUndefined();
            });
        });

        it('Expect destroying bucket ' + bucketName + ' for an unopenned database to be rejected', function () {
           QHelper(database.bucket(bucketName).drop(), 'Waiting for the bucket to be destroyed', function (state) {
               expect(state).toBe('rejected');
            });
        });

        it('Expect listing buckets for an unopenned database to be rejected', function () {
            QHelper(database.list(), 'Waiting for the buckets to be listed', function (state) {
                expect(state).toBe('rejected');
            });
        });

        // Starting normal call flow
        it('Expect openning the Database to succeed', function () {
            QHelper(database.open(), "Waiting for the database to be openned", function (state) {
               expect(state).toBe('fulfilled');
            });

        });

        it('Expect listing buckets for an empty database to succeed', function () {
            QHelper(database.list(), 'Waiting for the buckets to be listed', function (state, buckets) {
                expect(state).toBe('fulfilled');
                expect(buckets.length).toBe(0);
            });
        });

        it('Expect creating bucket ' + bucketName + ' to succeed', function () {
            QHelper(database.create(bucketName), 'Waiting for the bucket creation', function (state, bucket) {
               expect(state).toBe('fulfilled');
               expect(bucket).not.toBeNull();
               expect(bucket.db).not.toBeNull();
               expect(bucket.getName()).toBe(bucketName);
            });
        });

        it('Expect listing buckets for a database to succeed', function () {
            QHelper(database.list(), 'Waiting for the buckets to be listed', function (state, buckets) {
                expect(state).toBe('fulfilled');
                expect(buckets.length).toBe(1);
            });
        });

        var document = {key:"This is the Key of the Document", value : {doc : "This is a long text", author : "me, myself and I"}};
        var rev = uuid.v1();

        it('Expect creating a document  to success', function () {
            QHelper(database.bucket(bucketName).set(document.key, document.value), 'Waiting for key/value pair to be stored', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result).not.toBeNull();
               expect(result.key.id).toBe(keyValue.key);
               expect(result.key.rev).toBeGreaterThan(rev); // "rev" is a time UUID, therefore it should be greater than the one we have created before calling "set()"
               expect(result.value).toBe(keyValue.value);
            });
        });

        it('Expect creating bucket ' + bucketName + ' that already exist to succeed anyway', function () {
            QHelper(database.create(bucketName), 'Waiting for the bucket creation', function (state, bucket) {
               expect(state).toBe('fulfilled');
               expect(bucket).not.toBeNull();
               expect(bucket.db).not.toBeNull();
               expect(bucket.getName()).toBe(bucketName);
            });
        });

        it('Expect destroying bucket ' + bucketName + ' to succeed', function () {
           QHelper(database.bucket(bucketName).drop(), 'Waiting for the bucket to be destroyed', function (state) {
               expect(state).toBe('fulfilled');
            });
        });

        it('Expect destroying bucket ' + bucketName + ' again, to succeed anyway', function () {
           QHelper(database.bucket(bucketName).drop(), 'Waiting for the bucket to be destroyed', function (state) {
               expect(state).toBe('fulfilled');
            });
        });

        it('Expect listing buckets for an empty database to succeed', function () {
            QHelper(database.list(), 'Waiting for the buckets to be listed', function (state, buckets) {
                expect(state).toBe('fulfilled');
                expect(buckets.length).toBe(0);
            });
        });


        // Invalid call
        it('Expect retreiving the document from the destroyed bucket to be rejected', function () {
            QHelper(database.bucket(bucketName).get(document.key), 'Waiting for key/value pair retreival to fail', function (state, result) {
               expect(state).toBe('rejected');
               expect(result).toEqual({ errno : 1, code : 'SQLITE_ERROR' });
            });
        });

        // Clean up
        it('Expect Closing the Database to succeed', function () {
            QHelper(database.close(), "Waiting for the database to be closed", function (state) {
               expect(state).toBe('fulfilled');
            });
        });

        it('Expect listing buckets for a closed database to be rejected', function () {
            QHelper(database.list(), 'Waiting for the buckets to be listed', function (state) {
                expect(state).toBe('rejected');
            });
        });

        it('Expect Deleting the closed Database to succeed', function () {
            QHelper(database.delete(), "Waiting for the database to be deleted", function (state) {
               expect(state).toBe('fulfilled');
            });
        });
    });


    /////////////////////// DOCUMENT LIFE CYCLE ////////////////////////////

    describe('Testing Documents Life cycle within a ' + testDatabaseImplementation[index].name + ' Database', function () {

        var database   = new NoSqlite(testDatabaseImplementation[index].filename, {level:level, journal:false});
        var bucketName = 'Users';
        var bucket   = database.bucket(bucketName);
        var partialKey = "u::0001",
            exactKey    = {id : partialKey, rev:uuid.v1()},
            originalDoc = {firstname:"John",   lastname:"Do"},
            firstModif  = {firstname:"John",   lastname:"Smith"},
            secondModif = {firstname:"Granny", lastname:"Smith"},
            document    = {key:exactKey,       value:originalDoc},
            staleDoc    = document;

        // Invalid API calls
        it('Expect creating a document before openning the Database to be rejected', function () {
            QHelper(bucket.set(partialKey, originalDoc), 'Waiting for the document to be stored', function (state, result) {
               expect(state).toBe('rejected');
               expect(result).not.toBeNull();
            });
        });

        it('Expect counting documents before openning the Database to be rejected', function () {
            QHelper(bucket.count("*", {exact:false}), 'Waiting for the documents to be counted', function (state, count) {
                expect(state).toBe('rejected');
            });
        });

        // Normal call flow
        it('Expect Openning the Database to succeed', function () {
            QHelper(database.open(), "Waiting for the database to be openned", function (state) {
               expect(state).toBe('fulfilled');
            });
        });

        // Invalid call
        it('Expect creating a document before the bucket creation to be rejected', function () {
            QHelper(bucket.set(partialKey, originalDoc), 'Waiting for the document to be stored', function (state, result) {
               expect(state).toBe('rejected');
               expect(result).not.toBeNull();
            });
        });

        it('Expect counting documents before the bucket creation to be rejected', function () {
            QHelper(bucket.count("*", {exact:false}), 'Waiting for the documents to be counted', function (state, count) {
                expect(state).toBe('rejected');
            });
        });

        // Back to normal
        it('Expect Creating the bucket ' + bucketName + ' to succeed', function () {
            QHelper(database.create(bucketName), 'Waiting for the bucket creation', function (state, bucket) {
               expect(state).toBe('fulfilled');
               expect(bucket).not.toBeNull();
               expect(bucket.db).not.toBeNull();
               expect(bucket.getName()).toBe(bucketName);
            });
        });

        it('Expect counting documents of an empty bucket to succeed', function () {
            QHelper(bucket.count("*", {exact:false}), 'Waiting for the documents to be counted', function (state, count) {
                expect(state).toBe('fulfilled');
                expect(count).toBe(0);
            });
        });

        // We create the document, the API will return a revision number (for optimistic locking)
        it('Expect creating a document to succeed', function () {
            QHelper(bucket.set(document.key.id, document.value), 'Waiting for the document to be stored', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result).not.toBeNull();
               expect(result.key.id).toEqual(document.key.id);
               expect(result.key.rev).toBeGreaterThan(document.key.rev);  // A new rev has been generated (time uuid)
               expect(result.value).toEqual(document.value);
               expect(result.contentType).toBe(bucket.mime.json);
               staleDoc = document;
               document = result;
            });
        });

        it('Expect counting documents of a bucket to succeed', function () {
            QHelper(bucket.count("*", {exact:false}), 'Waiting for the documents to be counted', function (state, count) {
                expect(state).toBe('fulfilled');
                expect(count).toBe(1);
            });
        });


        // Fetch that exact document using the ID and Revision
        it('Expect Retreiving document with the id and the revision to succeed', function () {
            QHelper(bucket.get(document.key), 'Waiting for document to be Retreived', function (state, result) {
//            console.log("234:key=", document.key, ', result:', result);
               expect(state).toBe('fulfilled');
               expect(result).not.toBeNull();
               expect(result).toEqual(document);
               expect(result.contentType).toBe(bucket.mime.json);
            });
        });

        // Fetch with only the ID (any revision)
        it('Expect Retreiving document with the id only to succeed', function () {
            QHelper(bucket.get(document.key.id), 'Waiting for document to be Retreived', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result).not.toBeNull();
               expect(result).toEqual(document);
               expect(result.contentType).toBe(bucket.mime.json);
            });
        });

        // Modifying the exact document using ID and revision
        it('Expect modifying the document using the revision to succeed', function () {
            QHelper(bucket.set(document.key, firstModif, bucket.mime.json), 'Waiting for document to be changed', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result).not.toBeNull();

               expect(result.key.id).toEqual(document.key.id);
               expect(result.key.rev).toBeGreaterThan(document.key.rev); // A new rev has been generated
               expect(result.value).toEqual(firstModif);
               expect(result.contentType).toBe(bucket.mime.json);
               staleDoc = document;
               document = result;
            });
        });

        // Modifying the stale document using the id and revision
        it('Expect modifying the stale document using the id and revision to be rejected', function () {
            QHelper(bucket.set(staleDoc.key, secondModif), 'Waiting for document to be changed', function (state, result) {
               expect(state).toBe('rejected');
            });
        });

        // Fetching the latest version of the document using only the ID (any revision)
        it('Expect Retreiving document with the id only to succeed', function () {
            QHelper(bucket.get(document.key.id), 'Waiting for document to be Retreived', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result).not.toBeNull();
               expect(result).toEqual(document);
               expect(result.contentType).toBe(bucket.mime.json);
            });
        });

        // Modifying the stale document using the only the id
        it('Expect modifying the stale document using the id only to succeed', function () {
            QHelper(bucket.set(staleDoc.key.id, secondModif), 'Waiting for document to be changed', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result).not.toBeNull();
               expect(result.key.id).toEqual(staleDoc.key.id);
               expect(result.key.rev).toBeGreaterThan(staleDoc.key.rev); // newer than the stale doc
               expect(result.key.rev).toBeGreaterThan(document.key.rev); // newer than the original doc
               expect(result.value).toEqual(secondModif);
               expect(result.contentType).toBe(bucket.mime.json);
               staleDoc = document;
               document = result;
            });
        });



        // Deleting the document using the exact id and revision
        it('Expect Deleting the modified feteched document using the revision to succeed', function () {
            QHelper(bucket.del(document.key), 'Waiting for document to be Deleted', function (state) {
               expect(state).toBe('fulfilled');
            });
        });

        it('Expecting Retreiving a NONE-existing document using the revision to succeed with a null value', function () {
           QHelper(bucket.get(document.key), 'Waiting for document be retreived', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result).toBeNull();
            });
        });

        it('Expecting Retreiving a NONE-existing document using only the id to succeed with a null value', function () {
           QHelper(bucket.get(document.key.id), 'Waiting for document be retreived', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result).toBeNull();
            });
        });

        it('Expecting creating an array document to succeed', function () {
           QHelper(bucket.set("array", [1,"string", 3.14, true], bucket.mime.json), 'Waiting for document be retreived', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result.value).toEqual([1,"string", 3.14, true]);
               expect(result.value instanceof Array).toBe(true);
               expect(result.contentType).toBe(bucket.mime.json);
           });
        });

        var nbSimpleDocuments = 0;
        ++nbSimpleDocuments;
        it('Expecting creating an empty document to succeed', function () {
           QHelper(bucket.set("simple_document_empty", {}, bucket.mime.json), 'Waiting for document be retreived', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result.value).toEqual({});
               expect(result.contentType).toBe(bucket.mime.json);
            });
        });

        ++nbSimpleDocuments;
        it('Expecting creating an empty text to succeed', function () {
            QHelper(bucket.set("simple_text_empty", "", bucket.mime.text), 'Waiting for document be retreived', function (state, result) {
                expect(state).toBe('fulfilled');
                expect(result.value).toEqual("");
                expect(result.contentType).toBe(bucket.mime.text);
            });
        });

        ++nbSimpleDocuments;
        it('Expecting creating a string to succeed', function () {
           QHelper(bucket.set("simple_string","Hello World"), 'Waiting for document be retreived', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result.value).toBe("Hello World");
               expect(result.contentType).toBe(bucket.mime.text);
            });
        });

        ++nbSimpleDocuments;
        it('Expecting creating an empty string to succeed', function () {
           QHelper(bucket.set("simple_string_empty",""), 'Waiting for document be retreived', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result.value).toBe("");
               expect(result.contentType).toBe(bucket.mime.text);
            });
        });

        ++nbSimpleDocuments;
        it('Expecting creating an integer to succeed', function () {
           QHelper(bucket.set("simple_integer", 42), 'Waiting for document be retreived', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result.value).toEqual(42);
               expect(result.contentType).toBe(bucket.mime.text);
            });
        });

        ++nbSimpleDocuments;
        it('Expecting creating an integer with 0 to succeed', function () {
           QHelper(bucket.set("simple_integer_zero", 0), 'Waiting for document be retreived', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result.value).toEqual(0);
               expect(result.contentType).toBe(bucket.mime.text);
            });
        });

        ++nbSimpleDocuments;
        it('Expecting creating a real to succeed', function () {
           QHelper(bucket.set("simple_float", 3.1416), 'Waiting for document be retreived', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result.value).toEqual(3.1416);
               expect(result.contentType).toBe(bucket.mime.text);
            });
        });

        ++nbSimpleDocuments;
        it('Expecting creating a real with 0.0 to succeed', function () {
           QHelper(bucket.set("simple_float_zero", 0.0), 'Waiting for document be retreived', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result.value).toEqual(0.0);
               expect(result.contentType).toBe(bucket.mime.text);
            });
        });

        ++nbSimpleDocuments;
        it('Expecting creating a boolean true to succeed', function () {
           QHelper(bucket.set("simple_boolean_true", true), 'Waiting for document be retreived', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result.value).toBeTruthy()
               expect(result.contentType).toBe(bucket.mime.text);
            });
        });

        ++nbSimpleDocuments;
        it('Expecting creating a boolean false to succeed', function () {
           QHelper(bucket.set("simple_boolean_false", false), 'Waiting for document be retreived', function (state, result) {
               expect(state).toBe('fulfilled');
               expect(result.value).toBeFalsy();
               expect(result.contentType).toBe(bucket.mime.text);
            });
        });


        it('Expecting to fetch all the simple documents to succeed', function () {
           QHelper(bucket.get("simple_*", {exact:false, limit:100, offset:0}), 'Waiting for document be retreived', function (state, rows) {
               expect(state).toBe('fulfilled');
               expect(rows.length).toBe(nbSimpleDocuments);
               expect(rows[0].value).toEqual({});
               expect(rows[1].value).toEqual('');
               expect(rows[2].value).toBe("Hello World");
               expect(rows[3].value).toBe("");
               expect(rows[4].value).toEqual(42);
               expect(rows[5].value).toEqual(0);
               expect(rows[6].value).toEqual(3.1416);
               expect(rows[7].value).toEqual(0.0);
               expect(rows[8].value).toBeTruthy();
               expect(rows[9].value).toBeFalsy();
               
               expect(typeof(rows[0].value)).toBe("object");
               expect(typeof(rows[1].value)).toBe("string");
               expect(typeof(rows[2].value)).toBe("string");
               expect(typeof(rows[3].value)).toBe("string");
               expect(typeof(rows[4].value)).toBe("number");
               expect(typeof(rows[5].value)).toBe("number");
               expect(typeof(rows[6].value)).toBe("number");
               expect(typeof(rows[7].value)).toBe("number");
               expect(typeof(rows[8].value)).toBe("boolean");
               expect(typeof(rows[9].value)).toBe("boolean");
               
            });
        });

        it('Expect counting documents of a bucket to succeed', function () {
            QHelper(bucket.count("*", {exact:false}), 'Waiting for the documents to be counted', function (state, count) {
                expect(state).toBe('fulfilled');
                expect(count).toBe(nbSimpleDocuments +1);  // +1 == array document
            });
        });

        var limit = 6;
        it('Expecting to fetch first five simple documents to succeed', function () {
           QHelper(bucket.get("simple_*", {exact:false, limit:limit, offset:0}), 'Waiting for document be retreived', function (state, rows) {
               expect(state).toBe('fulfilled');
               expect(rows.length).toBe(nbSimpleDocuments > limit ? limit : nbSimpleDocuments);
               expoct(rows[0].value).toEqual({});
               expoct(rows[1].value).toEqual('');
               expect(rows[2].value).toBe("Hello World");
               expect(rows[3].value).toBe("");
               expect(rows[4].value).toEqual(42);
               expect(rows[5].value).toEqual(0);
           });
        });

        it('Expect counting documents of a bucket to succeed', function () {
            QHelper(bucket.count("simple_*", {exact:false, limit:limit, offset:limit}), 'Waiting for the documents to be counted', function (state, count) {
                expect(state).toBe('fulfilled');
                expect(count).toBe(nbSimpleDocuments);
            });
        });

        it('Expecting to fetch last four simple documents to succeed', function () {
           QHelper(bucket.get("simple_*", {exact:false, limit:limit, offset:limit}), 'Waiting for document be retreived', function (state, rows) {
               expect(rows.length).toBe((nbSimpleDocuments - limit) > limit ? limit : (nbSimpleDocuments - limit));
               expect(rows[0].value).toEqual(3.1416);
               expect(rows[1].value).toEqual(0.0);
               expect(rows[2].value).toBeTruthy();
               expect(rows[3].value).toBeFalsy();
            });
        });


        ////////////////////////////////////////////////////////////////////////////

        it('Expect Destroying bucket ' + bucketName + ' to succeed', function () {
           QHelper(database.bucket('bucket').drop(), 'Waiting for the bucket to be destroyed', function (state) {
               expect(state).toBe('fulfilled');
            });
        });

        it('Expect Closing the Database to succeed', function () {
            QHelper(database.close(), "Waiting for the database to be closed", function (state) {
               expect(state).toBe('fulfilled');
            });
        });
        it('Expect destroying the Database to succeed', function () {
            QHelper(database.delete(), "Waiting for the database to be deleted", function (state) {
               expect(state).toBe('fulfilled');
            });
        });
    });
}




