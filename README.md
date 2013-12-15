nosqlite
========

# A simple nosql implementation


This module can be installed as a REST server or embeded as a module.

#LICENSE:

This module is licensed under the Apache License v2.0

# Usage as a REST Server

npm install -g nosqlite

nosqlited --port=80

## Create MyDatabase
curl -X POST http://localhost:80/nosqlite/v1/MyDatabase

## Create MyBucket inside MyDatabase
curl -X POST http://localhost:80/nosqlite/v1/MyDatabase/MyBucket

## Create MyKey with a value of {"firstname":"Granny", "lastname":"Smith"}
curl -X PUT -H 'Content-Type: application/json' -d '{"firstname":"Granny", "lastname":"Smith"}' http://localhost:80/nosqlite/v1/MyDatabase/MyKey

## Getting back MyKey
curl http://localhost:80/nosqlite/v1/MyDatabase/MyBucket/MyKey

## Deleting MyKey
curl -X DELETE http://localhost:80/nosqlite/v1/MyDatabase/MyBucket/MyKey

## Deleting the whole Bucket with all the keys inside.
curl -X DELETE http://localhost:80/nosqlite/v1/MyDatabase/MyBucket


# Include this as a module in your own project

## project.js
    var NoSqlite = require('nosqlite');
    var db = new NoSqlite("MyDatabase", {level:'debug', journal:false}),
    db.open().then(function () {
        return db.create('MyBucket');
    }).then(function (bucket) {
        return bucket.set('MyKey', {firstname:'Granny', lastname:'Smith'});
    }).then(function () {
        return db.bucket('MyBucket').get('MyKey');
    }).then(function (value) {
        console.log('Value=', value);
        return db.close();
    }).then(function () {
        console.log('all is well, db closed');
    }, function (reason) {
        console.log('ERROR: an error occured when playing with the db. reason=', reason);
    }).done();
    
