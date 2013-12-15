module.exports = function () {
    var NoSqlite  = require('./nosqlite'),
        uuid      = require('node-uuid'),
        databases = {};
    
    function listDatabase(req, res) {
        var vector = [];
        for (var name in databases) {
            vector.push(name);
        }
        return res.json(200, {
            ok : true,
            length : vector.length,
            databases : vector
        });
    }
    
    function createDatabase(req, res, name) {
        if (databases[name]) {
            return res.json(409, {
                database: name,
                error   : "conflict",
                reason  : "Database already exists"
            });
        }
        databases[name] = {
            db     : new NoSqlite({level:'debug', journal:false}),
            name   : name,
            buckets:{}
        };
        
        databases[name].db.open().then(function () {
            return res.json(201, {
                ok       : true,
                database : name
            });
        }, function (reason) {
            return res.json(400, {
                database: name,
                error   : "Unable to create the database",
                reason  : reason
            });
        }).done();
    }
    
    function closeDatabase(req, res, name) {
        if (!databases[name]) {
            return res.json(404, {
                database: name,
                error   : "note found",
                reason  : "Database not openned"
            });
        }
        
        databases[name].db.close().then(function () {
            delete databases[name];
            return res.json(201, {
                ok       : true,
                database : name
            });
        }, function (reason) {
            return res.json(400, {
                database: name,
                error   : "Unable to close the database",
                reason  : reason
            });
        }).done();
    }
    
    function databaseRoutes(app, options) {
        app.post(options.context + '/:database', function (req, res) {
            var databaseName = req.params.database;
            return createDatabase(req, res, databaseName);
        });
        app.delete(options.context + '/:database', function (req, res) {
            var databaseName = req.params.database;
            return closeDatabase(req, res, databaseName);
        });
        app.get(options.context, function (req, res) {
            return listDatabase(req, res);
        });
    }
    
    ////////////////////////////////////////////////////////////////////////////
    
    function listBucket(req, res, databaseName) {
        if (!databases[databaseName]) {
            return res.json(404, {
                database: databaseName,
                error   : "not found",
                reason  : "Database not openned"
            });
        }
        var vector = [];
        for (var name in databases[databaseName].buckets) {
            vector.push(name);
        }
        
        return res.json(200, {
            ok : true,
            length : vector.length,
            buckets : vector,
            database : databaseName
        });
    }
    
    function createBucket(req, res, databaseName, bucketName) {
        console.log('BODY:', req.body);
        if (!databases[databaseName]) {
            return res.json(404, {
                database: databaseName,
                error   : "not found",
                reason  : "Database not openned"
            });
        }
        if (databases[databaseName].buckets[bucketName]) {
            return res.json(409, {
                database: databaseName,
                error   : "Conflict",
                reason  : "Bucket already exits"
            });
        }
        
        databases[databaseName].db.create(bucketName).then(function(bucket) {
            databases[databaseName].buckets[bucketName] = bucket;
            return res.json(201, {
                ok     : true,
                bucket : bucketName
            });
        },function (reason) {
            res.json(400, {
                error  : "Unable to create bucket",
                reason : reason,
                bucket : bucketName
            });
        }).done();
    }
    
    function deleteBucket(req, res, databaseName, bucketName) {
        if (!databases[databaseName]) {
            return res.json(404, {
                database: databaseName,
                bucket  : bucketName,
                error   : "not found",
                reason  : "Database not openned"
            });
        }
        if (!databases[databaseName].buckets[bucketName]) {
            return res.json(404, {
                database: databaseName,
                bucket  : bucketName,
                error   : "not found",
                reason  : "Bucket does not exists"
            });
        }
        
        databases[databaseName].db.drop(bucketName).then(function(bucket) {
            delete databases[databaseName].buckets[bucketName];
            return res.json(200, {
                ok       : true,
                database : databaseName,
                bucket   : bucketName
            });
        },function (reason) {
            res.json(400, {
                error    : "Unable to delete bucket",
                reason   : reason,
                database : databaseName,
                bucket   : bucketName
            });
        }).done();
    }
    
    function bucketRoutes(app, options) {
        app.get(options.context + '/:database', function (req, res) {
            var databaseName = req.params.database;
            return listBucket(req, res, databaseName);
        });

        app.post(options.context + '/:database/:bucket', function (req, res) {
            var databaseName = req.params.database,
                bucketName   = req.params.bucket;
            return createBucket(req, res, databaseName, bucketName);
        });
        
        app.delete(options.context + '/:bucket', function (req, res) {
            var databaseName = req.params.database,
                bucketName   = req.params.bucket;
            return deleteBucket(req, res, databaseName, bucketName);
        });
    }
    
    ////////////////////////////////////////////////////////////////////////////
    function getKey(req, res, databaseName, bucketName, key) {
        if (!databases[databaseName]) {
            return res.json(404, {
                database: databaseName,
                bucket  : bucketName,
                key     : key,
                error   : "not found",
                reason  : "Database not openned"
            });
        }
        if (!databases[databaseName].buckets[bucketName]) {
            return res.json(404, {
                database: databaseName,
                bucket  : bucketName,
                key     : key,
                error   : "not found",
                reason  : "Bucket does not exists"
            });
        }
        databases[databaseName].buckets[bucketName].get(key).then(function(value) {
            if (value) {
                res.json(200, value);
            } else {
                res.json(404, {
                    database: databaseName,
                    bucket  : bucketName,
                    key     : key,
                    error   : "not found",
                    reason  : "Key does not exists"
                });
            }
        },function (reason) {
            res.json(400,{
                database: databaseName,
                bucket  : bucketName,
                key     : key,
                error   : "Unable to retreive key",
                reason  : reason
            });
        }).done();
    }
    
    function setKey(req, res, databaseName, bucketName, key, value) {
        if (!databases[databaseName]) {
            return res.json(404, {
                database: databaseName,
                bucket  : bucketName,
                key     : key,
                error   : "not found",
                reason  : "Database not openned"
            });
        }
        if (!databases[databaseName].buckets[bucketName]) {
            return res.json(404, {
                database: databaseName,
                bucket  : bucketName,
                key     : key,
                error   : "not found",
                reason  : "Bucket does not exists"
            });
        }
        databases[databaseName].buckets[bucketName].set(key, value).then(function(result) {
            return res.json(200, result);
        },function (reason) {
            res.json(400,{
                database: databaseName,
                bucket  : bucketName,
                key     : key,
                error   : "Unable to set key",
                reason  : reason
            });
        }).done();
    }
    
    function delKey(req, res, databaseName, bucketName, key) {
        if (!databases[databaseName]) {
            return res.json(404, {
                database: databaseName,
                bucket  : bucketName,
                key     : key,
                error   : "not found",
                reason  : "Database not openned"
            });
        }
        if (!databases[databaseName].buckets[bucketName]) {
            return res.json(404, {
                database: databaseName,
                bucket  : bucketName,
                key     : key,
                error   : "not found",
                reason  : "Bucket does not exists"
            });
        }
        databases[databaseName].buckets[bucketName].del(key).then(function() {
            res.json(201);
        },function (reason) {
            res.json(400,{
                database: databaseName,
                bucket  : bucketName,
                key     : key,
                error   : "Unable to delete key",
                reason  : reason
            });
        }).done();
    }
    
    function keyValuePairRoutes(app, options) {
        app.get(options.context + '/:database/:bucket/:key', function (req, res) {
            var databaseName = req.params.database,
                bucketName   = req.params.bucket,
                key          = req.params.key;
            return getKey(req, res, databaseName, bucketName, key);
        });
        app.post(options.context + '/:database/:bucket', function (req, res) {
            var databaseName = req.params.database,
                bucketName   = req.params.bucket,
                key          = uuid.v1(), // Time UUID
                value        = req.body;
            return setKey(req, res, databaseName, bucketName, key, value);
        });
        app.put(options.context + '/:database/:bucket/:key', function (req, res) {
            var databaseName = req.params.database,
                bucketName   = req.params.bucket,
                key          = req.params.key,
                value        = req.body;
            return setKey(req, res, databaseName, bucketName, key, value);
        });
        app.delete(options.context + '/:database/:bucket/:key', function (req, res) {
            var databaseName = req.params.database,
                bucketName   = req.params.bucket,
                key          = req.params.key;
            return delKey(req, res, databaseName, bucketName, key);
        });
    }
    
    ////////////////////////////////////////////////////////////////////////////
    
    function routes(app, options) {
        databaseRoutes(app, options);
        bucketRoutes(app, options);
        keyValuePairRoutes(app, options);
    }
    
    return routes;
}();