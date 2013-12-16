// spec/nosqlite-spec.js
var libpath = process.env['NOSQLITE_COVERAGE'] ? '../lib-cov' : '../lib',
    NoSqlite = require(libpath + '/nosqlite'),
    QHelper  = require('./Qhelper');

console.log('Loading ' + libpath + ' libraries');
describe("Testing an in Memory Database Life cycle", function () {
    
    var database = new NoSqlite({level:'warn', journal:false});
    it('Openning the Memory Database', function () {
        QHelper(database.open(), "Waiting for the database to be openned", function (state) {
           expect(state).toBe('fulfilled'); 
        });
    });
    
    it('Closing the Memory Database', function () {
        QHelper(database.close(), "Waiting for the database to be closed", function (state) {
           expect(state).toBe('fulfilled'); 
        });
    });
});

describe("Testing a Bucket Life cycle", function () {
    
    var database   = new NoSqlite({level:'warn', journal:false});
    var bucketName = 'bilbucket';

    it('Openning the Memory Database', function () {
        QHelper(database.open(), "Waiting for the database to be openned", function (state) {
           expect(state).toBe('fulfilled'); 
        });
    });
    
    ////////////////////////////////////////////////////////////////////////////
    it('Creating ' + bucketName + ' Bucket', function () {
        QHelper(database.create(bucketName), 'Waiting for the bucket creation', function (state, bucket) {
           expect(state).toBe('fulfilled');
           expect(bucket).not.toBeNull();
           expect(bucket.db).not.toBeNull();
           expect(bucket.getName()).toBe(bucketName);
        });        
    });

    var keyValue      = {key:"key", value:"value"};
    it('Creating a key/value pair in the new bucket', function () {
        QHelper(database.bucket(bucketName).set(keyValue.key, keyValue.value), 'Waiting for key/value pair to be stored', function (state, result) {
           expect(state).toBe('fulfilled');
           expect(result).not.toBeNull();
           expect(result).toEqual(keyValue);
        });
    });
    
    it('Destroying ' + bucketName + ' Bucket', function () {
       QHelper(database.drop(bucketName), 'Waiting for the bucket to be destroyed', function (state) {
           expect(state).toBe('fulfilled');
        });
    });
    
    it('Retreiving a key/value pair from a destroyed bucket bucket', function () {
        QHelper(database.bucket(bucketName).get(keyValue.key), 'Waiting for key/value pair retreival to fail', function (state, result) {
           expect(state).toBe('rejected');
           expect(result).toEqual({ errno : 1, code : 'SQLITE_ERROR' });
        });
    });
    
    ////////////////////////////////////////////////////////////////////////////
    
    it('Closing the Memory Database', function () {
        QHelper(database.close(), "Waiting for the database to be closed", function (state) {
           expect(state).toBe('fulfilled'); 
        });
    });
});



describe("Testing Key.Value pair Life Cycle", function () {
    
    var database   = new NoSqlite({level:'warn', journal:false});
    var bucketName = 'Users';

    it('Openning the Memory Database', function () {
        QHelper(database.open(), "Waiting for the database to be openned", function (state) {
           expect(state).toBe('fulfilled'); 
        });
    });
    
    it('Creating ' + bucketName + ' Bucket', function () {
        QHelper(database.create(bucketName), 'Waiting for the bucket creation', function (state, bucket) {
           expect(state).toBe('fulfilled');
           expect(bucket).not.toBeNull();
           expect(bucket.db).not.toBeNull();
           expect(bucket.getName()).toBe(bucketName);
        });        
    });
    
    ////////////////////////////////////////////////////////////////////////////
    var keyValue      = {key:"user::00001", value:{firstname:"Bob", lastname:"Dole"}},
        valueModified = {firstname:"Boby"};
    
    it('Creating a new key/value pair', function () {
        QHelper(database.bucket(bucketName).set(keyValue.key, keyValue.value), 'Waiting for key/value pair to be stored', function (state, result) {
           expect(state).toBe('fulfilled');
           expect(result).not.toBeNull();
           expect(result).toEqual(keyValue);
        });
    });
    
    it('Retreiving the key/value pair', function () {
        QHelper(database.bucket(bucketName).get(keyValue.key), 'Waiting for Key/Value pair to be Retreived', function (state, result) {
           expect(state).toBe('fulfilled');
           expect(result).not.toBeNull();
           expect(result).toEqual(keyValue.value);
        });
    });
    
    it('Modifying an existing key/value pair', function () {
        QHelper(database.bucket(bucketName).set(keyValue.key, valueModified), 'Waiting for key/value pair to be changed', function (state, result) {
           expect(state).toBe('fulfilled');
           expect(result).not.toBeNull();
           expect(result).toEqual({key:keyValue.key, value:valueModified});
        });
    });

    it('Deleting the modified Key/Value Pair', function () {
        QHelper(database.bucket(bucketName).del(keyValue.key), 'Waiting for Key/Value pair to be Deleted', function (state) {
           expect(state).toBe('fulfilled');
        });
    });
    
    it('Retreiving an NONE-existing KeyValue pair', function () {
       QHelper(database.bucket(bucketName).get(keyValue.key), 'Waiting for key/value to fail Retrieval', function (state, result) {
           expect(state).toBe('fulfilled');
           expect(result).toBeNull();
        });
    });
    
    
    ////////////////////////////////////////////////////////////////////////////
    
    it('Destroying ' + bucketName + ' Bucket', function () {
       QHelper(database.drop('bucket'), 'Waiting for the bucket to be destroyed', function (state) {
           expect(state).toBe('fulfilled');
        });
    });
    
    it('Closing the Memory Database', function () {
        QHelper(database.close(), "Waiting for the database to be closed", function (state) {
           expect(state).toBe('fulfilled'); 
        });
    });
});





