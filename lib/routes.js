module.exports = function () {
    var NoSqlite  = require('./nosqlite'),
        uuid      = require('node-uuid'),
        Q         = require('q'),
        path      = require('path'),
        fs        = require('fs'),
        logger    = null,
        dataPath  = '.',
        databases = {},
        meta    = {
            "module" : "routes",
            "pid"    : process.pid
        };

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
    
    function createDatabase(req, res, name, memory) {
        if (databases[name]) {
            return res.json(409, {
                database: name,
                error   : "conflict",
                reason  : "Database already exists"
            });
        }
        databases[name] = {
            db     : new NoSqlite(memory ? ':memory:' : path.join(dataPath, name), {level:'debug', journal:false}),
            name   : name,
            memory : memory,
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
        app.post(options.api + '/:database', function (req, res) {
            var databaseName = req.params.database,
                memory       = req.query.memory;

            return createDatabase(req, res, databaseName, memory);
        });
        app.delete(options.api + '/:database', function (req, res) {
            var databaseName = req.params.database;
            return closeDatabase(req, res, databaseName);
        });
        app.get(options.api, function (req, res) {
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
        var promises = [];
        var closure = function (bucketName, promise) {
            promise.then(function (count, elapsed) {
                vector.push({name:bucketName, count:count});
            });
        };
        for (var name in databases[databaseName].buckets) {
            var promise = databases[databaseName].buckets[name].count();
            promises.push(promise);
            closure(name, promise);
        }
        Q.all(promises).then(function (result, elapsed) {
            return res.json(200, {
                ok : true,
                length : vector.length,
                buckets : vector,
                database : databaseName
            });
        }, function (reason, result, elapsed) {
            return res.json(400, {
                error : 'Unable to estimae bucket size',
                reason : reason,
                database : databaseName
            });
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
        app.get(options.api + '/:database', function (req, res) {
            var databaseName = req.params.database;
            return listBucket(req, res, databaseName);
        });

        app.post(options.api + '/:database/:bucket', function (req, res) {
            var databaseName = req.params.database,
                bucketName   = req.params.bucket,
                value        = req.body,
                empty        = req.body === "";
            
            // POST /database/bucket with a BODY is a key/value creattion
            if (!empty) {
                return setKey(req, res, databaseName, bucketName, uuid.v1(), value);
            }
            // POST /database/bucket with an EMPTY BODY is a bucket creation
            return createBucket(req, res, databaseName, bucketName);
        });
        
        app.delete(options.api + '/:database/:bucket', function (req, res) {
            var databaseName = req.params.database,
                bucketName   = req.params.bucket;
            return deleteBucket(req, res, databaseName, bucketName);
        });
    }
    
    ////////////////////////////////////////////////////////////////////////////
    function getKey(req, res, databaseName, bucketName, key, options) {
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
        key = fixKey(key);
        databases[databaseName].buckets[bucketName].get(key, options).then(function(value, elapsed) {
            if (value) {
                if (options.valueOnly) {
                    if (!value.contentType) {
                        res.setHeader("Content-Type", 'text/plain; charset="UTF-8"');
                        res.end(typeof(value.value) === 'object' ? JSON.stringify(value.value) : value.value);
                    } else if (value.contentType.match(/^application\/json/i)) {
                        res.setHeader("Content-Type", value.contentType);
                        res.json(200, value.value);
                    } else if (value.contentType.match(/^text\//i)) {
                        res.setHeader("Content-Type", value.contentType);
                        res.end(value.value);
                    } else {
                        res.setHeader("Content-Type", 'text/plain; charset="UTF-8"');
                        res.end(value.value);
                    }
                } else
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
        },function (reason, result, elapsed) {
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
        key = fixKey(key);
        var contentType = req.get('X-Content-Type') ? req.get('X-Content-Type') : req.get('Content-Type');
        console.log('set:content-type=', req.get('Content-Type'), ', X-Content-type=', req.get('X-Content-Type'), ', ==> ', contentType);
        databases[databaseName].buckets[bucketName].set(key, value, contentType).then(function(result, elapsed) {
            return res.json(200, result);
        },function (reason, result, elapsed) {
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
        key = fixKey(key);
        databases[databaseName].buckets[bucketName].del(key).then(function(obj, result, elapsed) {
            res.json(201);
        },function (reason, result, elapsed) {
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
        function getDocument(req, res) {
            var databaseName = req.params.database,
                bucketName   = req.params.bucket,
                key          = parseIfJson(req.params.key),
                exact        = req.query.exact,
                limit        = req.query.limit,
                offset       = req.query.offset,
                path         = req.params[0],
                options = {
                    exact  : (typeof(exact) === 'undefined' ? true : /^(true|1)$/i.test(exact)),
                    limit  : limit,
                    offset : offset
                };

            if (path) {
                key = key + '/' + path;
            }
            return getKey(req, res, databaseName, bucketName, key, options);
        }
        function getDocumentValue(req, res) {
            var databaseName = req.params.database,
                bucketName   = req.params.bucket,
                key          = parseIfJson(req.params.key),
                exact        = req.query.exact,
                limit        = req.query.limit,
                offset       = req.query.offset,
                path         = req.params[0],
                options = {
                    exact  : (typeof(exact) === 'undefined' ? true : /^(true|1)$/i.test(exact)),
                    limit  : limit,
                    offset : offset,
                    valueOnly : true
                };

            if (path) {
                key = key + '/' + path;
            }
            return getKey(req, res, databaseName, bucketName, key, options);
        }

        app.get(options.api + '/value/:database/:bucket/:key', getDocumentValue);
        app.get(options.api + '/value/:database/:bucket/:key/*', getDocumentValue);
        app.get(options.api + '/:database/:bucket/:key', getDocument);
        app.get(options.api + '/:database/:bucket/:key/*', getDocument);



        app.post(options.api + '/:database/:bucket', function (req, res) {
            var databaseName = req.params.database,
                bucketName   = req.params.bucket,
                key          = uuid.v1(), // Time UUID
                value        = req.body;
            return setKey(req, res, databaseName, bucketName, key, value);
        });

        function putDocument(req, res) {
            var databaseName = req.params.database,
                bucketName   = req.params.bucket,
                key          = parseIfJson(req.params.key),
                value        = req.body,
                path         = req.params[0];
            console.log(req.get('Content-Type'), req.get('Content-Type') === 'text/plain; charset="UTF-8"');
            if (path) {
                key = key + '/' + path;
            }
            /*
            if (req.get('Content-Type') === 'text/plain; charset="UTF-8"') {
                return readRawBody(req, res, function(req, res, body) {
                    console.log('body=', body);
                    return setKey(req, res, databaseName, bucketName, key, body);
                });
            }
            */
            return setKey(req, res, databaseName, bucketName, key, value);
        }

        app.put(options.api + '/:database/:bucket/:key', putDocument);
        app.put(options.api + '/:database/:bucket/:key/*', putDocument);

        app.delete(options.api + '/:database/:bucket/:key', function (req, res) {
            var databaseName = req.params.database,
                bucketName   = req.params.bucket,
                key          = parseIfJson(req.params.key);
            return delKey(req, res, databaseName, bucketName, key);
        });
    }
    
    ////////////////////////////////////////////////////////////////////////////

    /*
    function readRawBody(req, res, next) {
        var data='';
        req.setEncoding('utf8');
        req.on('data', function(chunk) { 
            data += chunk;
        });

        req.on('end', function() {
            req.body = data;
            next(req, res, data);
        });
    }
    */

    function parseIfJson(json) {
        var obj;
        try {
            obj = JSON.parse(json);
        } catch (e) {
            obj = json;
        }
        return obj;
    }

    function resourceRoutes(app, options) {
        if (options.ui) {
            app.get(path.join(options.ui, 'js/application/nosqlite-application.js'), function (req, res) {
                fs.readFile(path.join(path.dirname(fs.realpathSync(__filename)), '../public/js/application/nosqlite-application.js'), function (err, data) {
                    if (err) throw err;
                    res.setHeader("Content-Type", "application/javascript");
                    data = (''+data).replace(/\s*\$rootScope\.baseAPIurl\s*=\s*['"][^'"]*['"]\s*;/, "$rootScope.baseAPIurl = '" + options.api + "';").
                        replace(/\s*\$rootScope\.baseUIurl\s*=\s*['"][^'"]*['"]\s*;/, "$rootScope.baseUIurl = '" + options.ui + "';");
                    res.end(data);
                });
            });
        }
    }

    function fetchBucketList(promise, database) {
        promise.then(function () {
            database.db.list().then(function (buckets) {
                logger.log('info', 'buckets=%j', buckets, meta);
                for (var i = 0 ; i < buckets.length ; ++i) {
                    database.buckets[buckets[i].name] = database.db.bucket(buckets[i].name);
                }
            });
        });
    }

    function init(options) {
        logger = options.logger;
        dataPath = options.data;
        if (!fs.existsSync(options.data))
            fs.mkdirSync(options.data);

        var files = fs.readdirSync(options.data);
        var promises = [];
        for (var i = 0 ; i < files.length ; ++i) {
            if (files[i].match(/\.nosql$/)) {
                var name = files[i].substr(0, files[i].length - 6);
                databases[name] = {
                    db     : new NoSqlite(path.join(options.data, name), {level:'debug', journal:false}),
                    name   : name,
                    memory : false,
                    buckets:{}
                };
                var promise = databases[name].db.open();
                fetchBucketList(promise, databases[name]);
                promises.push(promise);
            }
        }
        return Q.all(promises);
    }


    function fixKey(key) {
        try {
            key = JSON.parse(key);
        } catch (e) {};
        return key
    }
    ////////////////////////////////////////////////////////////////////////////

    function routes(app, options) {
        var promise = init(options);
        promise.then(function () {
            logger.log('verbose', 'open|success', meta);
            resourceRoutes(app, options);
            databaseRoutes(app, options);
            bucketRoutes(app, options);
            keyValuePairRoutes(app, options);
        }, function (reason) {
            logger.log('error', 'open|ERROR|reason=%j', reason, meta);
            process.exit(-1);
        });
    }
    
    return routes;
}();