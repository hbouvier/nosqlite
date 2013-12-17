module.exports = function () {
    var Q       = require('q'),
        sqlite3 = require('sqlite3'),
        fs      = require('fs'),
        winston = require('winston'),
        uuid    = require('node-uuid'),
        meta    = {
            "module" : "nosqlite"
        };

    ////////////////////////////////////////////////////////////////////////////
    
    /**
     * options:
     *          - level   : debug|verbose|info|warn|error
     *          - journal : true|false
     * 
     */
    function Database(database, options) {
        if (typeof(database) === 'object') {
            options  = database;
            database = null;
        }
        database        = database || ':memory:';
        options         = options  || {};
        options.level   = options.level || 'info';
        options.journal = typeof(options.journal) !== 'undefined' ? options.journal : true;

        this.database = database;
        this.inMemory = (database === ':memory:');
        
        var transports = [new (winston.transports.Console)({
                "level"    : options.level,
                "json"     : false,
                "colorize" : true
            })];
        if (!this.inMemory && options.journal) {
            transports.push(new (winston.transports.File)({
                "filename" : this.database + ".journal",
                "level"    : "info", // debug|verbose|info|warn|error
                "json"     : true,
                "colorize" : false
            }));
        }
        this.logger = new (winston.Logger)({ transports: transports});
    }
    
    Database.prototype.open = function () {
        var $this    = this,
            deferred = Q.defer();
            
        if (this.inMemory) {
            this.exists = false;
            this.sqlite = new sqlite3.Database(this.database, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, function (err, result) {
                if (err) return deferred.reject(err);
                deferred.resolve();
            });
        } else {
            fs.exists(this.database + '.nosql', function (exists) {
                var mode = sqlite3.OPEN_READWRITE | (exists ? 0 : sqlite3.OPEN_CREATE );
                $this.exists = exists;
                $this.sqlite = new sqlite3.Database($this.database + ".nosql", mode, function (err, result) {
                    if (err) return deferred.reject(err);
                    deferred.resolve();
                });
            });
        }
        return deferred.promise;        
    };
    
    Database.prototype.close = function () {
        return Q.ninvoke(this.sqlite, 'close');
    };

    Database.prototype.create = function (bucket) {
        var $this    = this,
            deferred = Q.defer();
        
        sqlCreate($this, bucket, function (err, result) {
            if (err) return deferred.reject(err);
            deferred.resolve(new Bucket($this, bucket));
        });
        return deferred.promise;
    };
    
    Database.prototype.drop = function (bucket) {
        var $this    = this,
            deferred = Q.defer();
        
        sqlDrop($this, bucket, function (err, result) {
            if (err) return deferred.reject(err);
            deferred.resolve();
        });
        return deferred.promise;
    };
    
    Database.prototype.bucket = function (bucket) {
        return new Bucket(this, bucket);
    };
    
    ////////////////////////////////////////////////////////////////////////////
    
    function Bucket(db, name) {
        this.db      = db;
        this.name    = name;
    }
    
    Bucket.prototype.getName = function () { return this.name; };
    
    
    Bucket.prototype.set = function (key, value) {
        var deferred = Q.defer();
        sqlUpsert(this.db, this.name, key, value, function (err, result, elapsed) {
            if (err) return deferred.reject(err, result, elapsed);
            return deferred.resolve(result, elapsed);
        });
        return deferred.promise;
    };
    
    Bucket.prototype.get = function (key, options) {
        var deferred = Q.defer();
        options = options || {exact:true, limit:2, offset:0};
        options.exact = isdef(options.exact) ? istrue(options.exact) : true;
        options.limit = options.limit || (options.exact ? 2 : 1000);
        sqlSelect(this.db, this.name, key, options, function (err, rows, elapsed) {
            if (err || !rows) return deferred.reject(err, rows, elapsed);
            if (rows.length === 0) return deferred.resolve(null, elapsed);
            if (options.exact === true) return rows.length === 1 ? deferred.resolve(rows[0], elapsed) : deferred.reject(new Error("Multiple Matches (" + rows.length +")"), rows, elapsed);
            return deferred.resolve(rows, elapsed);
        });
        return deferred.promise;
    };

    Bucket.prototype.del = function (key) {
        var deferred = Q.defer();
            
        sqlDelete(this.db, this.name, key, function (err, result, elapsed) {
            if (err) return deferred.reject(err, result, elapsed);
            return deferred.resolve(result, elapsed);
        });
        return deferred.promise;
    };

    //////////////////////////////////// PRIVATE ///////////////////////////////
    
    function sqlCreate(db, bucket, next) {
        var timer  = new Timer(),
            phrase = 'CREATE TABLE IF NOT EXISTS ' + bucket + ' (key PRIMARY KEY, rev TEXT, value TEXT)';
        db.sqlite.run(phrase, function (err, result) {
            db.logger.log(err ? 'error' : 'info', {
                method:'create',
                database: db.database,
                bucket: bucket,
                phrase:phrase,
            }, {
                err:err, 
                result:result,
                elapsedSecMsNanoInMs:timer.end().elapsed(true)
            }, meta);
            
            if (next) next(err, result, timer.elapsed(true));
        });
    }
    
    function sqlDrop(db, bucket, next) {
        var timer  = new Timer(),
            phrase = 'DROP TABLE IF EXISTS ' + bucket;
        db.sqlite.run(phrase, function (err, result) {
            db.logger.log(err ? 'error' : 'info', {
                method:'drop',
                database: db.database,
                bucket: bucket,
                phrase:phrase,
            }, {
                err:err, 
                result:result,
                elapsedSecMsNanoInMs:timer.end().elapsed(true)
            }, meta);
            
            if (next) next(err, result, timer.elapsed(true));
        });
    }
    
    function sqlSelect(db, bucket, key, options, next) {
        var timer    = new Timer(),
            selector;
            
        if (typeof(options) === 'function') {
            next = options;
            options = {};
        }
        if (typeof(key) !== 'object') {
            selector = {$key:key};
        } else {
            selector = {$key:key.key, $rev:key.rev};
        }
        
        if (options.exact === false) {
            selector.$key = selector.$key.replace(/\*/g, '%');
        }

        var phrase   = 'SELECT key, rev, value FROM ' + bucket + ' WHERE key ' +
            (options.exact === false ? 'LIKE' : '=') +  ' $key' +
            (selector.$rev ? ' AND rev = $rev' : '') +
            (options.offset ? ' OFFSET ' + options.offset : '') +
            (options.limit ? ' LIMIT ' + options.limit : '');

        db.sqlite.all(phrase, selector, function (err, rows) {
            db.logger.log(err ? 'warn' : 'verbose', {
                method:'select',
                database: db.database,
                bucket: bucket,
                options:options,
                phrase:phrase,
                selector:selector
            }, {
                err:err, 
                rows:rows,
                elapsedSecMsNanoInMs:timer.end().elapsed(true)
            }, meta);
            if (next) {
                if (rows && rows.length > 0) {
                    for (var i = 0 ; i < rows.length ; ++i) {
                        rows[i].key   = selector.$key;
                        rows[i].meta  = {rev:rows[i].rev};
                        rows[i].value = parseIfJson(rows[i].value);
                        delete rows[i].rev;
                    }
                    db.logger.log('debug', {method:'select',result:rows}, meta);
                }
                next(err, rows, timer.elapsed(true));
            }
        });
    }
    
    function sqlUpsert(db, bucket, key, value, next) {
        var timer    = new Timer(),
            document,
            phrase   = 'INSERT OR REPLACE INTO ' + bucket + ' (key, rev, value) VALUES ($key, $rev, $value)';
            
        if (typeof(key) !== 'object') {
            document = {$key:key, $rev:uuid.v1(), $value:stringyIfObject(value)};
        } else {
            document = {$key:key.key, $origrev:key.rev, $rev:uuid.v1(), $value:stringyIfObject(value)};
            phrase += ' WHERE rev = $origrev';
        }

        db.sqlite.run(phrase, document, function (err, result) {
            db.logger.log(err ? 'error' : 'info', {
                method:'upsert',
                database: db.database,
                bucket: bucket,
                phrase:phrase,
                document:document
            }, {
                err:err, 
                result:result,
                elapsedSecMsNanoInMs:timer.end().elapsed(true)
            }, meta);
            if (next) {
                var obj = {key:document.$key, meta:{rev:document.$rev}, value:value};
                db.logger.log('debug', {method:'upsert', result:obj}, meta);
                next(err, obj, timer.elapsed(true));
            }
        });
    }
    
    function sqlDelete(db, bucket, key, next) {
        var timer    = new Timer(),
            phrase   = 'DELETE FROM ' + bucket + ' WHERE key = $key',
            selector;
            
        if (typeof(key) !== 'object') {
            selector = {$key:key};
        } else {
            selector = {$key:key.key, $rev:key.rev};
            phrase += ' AND rev = $rev';
        }
            
        db.sqlite.run(phrase, selector, function (err, result) {
            db.logger.log(err ? 'warn' : 'verbose', {
                method:'delete',
                database: db.database,
                bucket: bucket,
                phrase:phrase,
                selector:selector
            }, {
                err:err, 
                result:result,
                elapsedSecMsNanoInMs:timer.end().elapsed(true)
            }, meta);
            if (next) {
                next(err, {key:selector.$key,meta:{rev:selector.$rev}}, timer.elapsed(true));
            }
        });
    }
    
    //////////////////////////// UTILITIES /////////////////////////////////////
    
    function Timer() {
        this.timestamp        = process.hrtime();
    }
    Timer.prototype.end = function () {
        this.elapsedhr = process.hrtime(this.timestamp);
        return this;
    };
    
    Timer.prototype.elapsed = function (nano) {
        this.elapsedVec = ((this.elapsedhr[1] / 1000000).toFixed(nano ? 3 : 0)).split('.');
        this.elapsedVec.unshift(this.elapsedhr[0]);
        return this.elapsedVec;
    };
        
    function stringyIfObject(obj) {
        return (typeof(obj) === 'string') ? obj : JSON.stringify(obj);
    }
    function parseIfJson(json) {
        var obj;
        try {
            obj = JSON.parse(json);
        } catch (e) {
            obj = json;
        }
        return obj;
    }
    
    function istrue(value) {
        return (/^(true|1)$/i).test(value);
    }
    
    function isdef(value) {
        return typeof(value) !== 'undefined';	
    }

    return Database;
}();
