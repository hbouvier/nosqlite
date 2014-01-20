NoSQLiteD [![Build Status](https://travis-ci.org/hbouvier/nosqlite.png)](https://travis-ci.org/hbouvier/nosqlite) [![Coverage Status](https://coveralls.io/repos/hbouvier/nosqlite/badge.png)](https://coveralls.io/r/hbouvier/nosqlite)
========

# Yet another NoSQL implementation

This NoSQL database can be embeded, as a library to your project or started as a REST Service (daemon)

#LICENSE:

This module is licensed under the Apache License v2.0

# Usage as a REST Server

npm install -g nosqlited

nosqlited --port=4200

## Create MyDatabase
curl -X POST http://localhost:4200/nosqlite/api/v1/MyDatabase

## Create MyBucket inside MyDatabase
curl -X POST http://localhost:4200/nosqlite/api/v1/MyDatabase/MyBucket

## Create MyKey with a value of {"firstname":"Granny", "lastname":"Smith"}
curl -X PUT -H 'Content-Type: application/json' -d '{"firstname":"Granny", "lastname":"Smith"}' http://localhost:4200/nosqlite/api/v1/MyDatabase/MyKey

## Getting back MyKey
curl http://localhost:4200/nosqlite/api/v1/MyDatabase/MyBucket/MyKey

## Deleting MyKey
curl -X DELETE http://localhost:4200/nosqlite/api/v1/MyDatabase/MyBucket/MyKey

## Deleting the whole Bucket with all the keys inside.
curl -X DELETE http://localhost:4200/nosqlite/api/v1/MyDatabase/MyBucket


# Include this as a module in your own project

## project.js
    var NoSqlite = require('nosqlited');
    var db = new NoSqlite("MyDatabase", {level:'debug', journal:false});

    db.open().then(function () {
        return db.create('MyBucket');
    }).then(function (bucket) {
        return bucket.set('MyKey', {firstname:'Granny', lastname:'Smith'});
    }).then(function () {
        return db.bucket('MyBucket').get('MyKey');
    }).then(function (document) {
        console.log('document=', document.value);
        return db.close();
    }).then(function () {
        console.log('all is well, db closed');
    }, function (reason) {
        console.log('ERROR: an error occured when playing with the db. reason=', reason);
    }).done();
    
