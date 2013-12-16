module.exports = function () {
    var Q       = require('q'),
        sqlite3 = require('sqlite3'),
        fs      = require('fs'),
        winston = require('winston'),
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
        sqlUpsert(this.db, this.name, key, value, function (err, result) {
            if (err) return deferred.reject(err);
            return deferred.resolve({key:key, value:value});
        });
        return deferred.promise;
    };
    
    Bucket.prototype.get = function (key, options) {
        var deferred = Q.defer();
        console.log(options)
        options = options || {exact:true, limit:2};
        options.exact = typeof(options.exact) === 'undefined' ? true : options.exact;
        options.limit = options.limit || (options.exact ? 2 : 1000);
        console.log(options)
        sqlSelect(this.db, this.name, key, options, function (err, rows) {
            if (err || !rows) return deferred.reject(err);
            if (rows.length === 0) return deferred.resolve(null);
            if (options.exact === true) return rows.length === 1 ? deferred.resolve(rows[0].value) : deferred.reject(new Error("Multiple Matches (" + rows.length +")"));
            return deferred.resolve(rows);
        });
        return deferred.promise;
    };

    Bucket.prototype.del = function (key) {
        var deferred = Q.defer();
            
        sqlDelete(this.db, this.name, key, function (err, result) {
            if (err) return deferred.reject(err);
            return deferred.resolve();
        });
        return deferred.promise;
    };

    //////////////////////////////////// PRIVATE ///////////////////////////////
    function parse(json) {
        var obj;
        try {
            obj = JSON.parse(json);
        } catch (e) {
            obj = json;
        }
        return obj;
    }
    
    ////////////////////////////////////////////////////////////////////////////
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
        
    function sqlCreate(db, bucket, next) {
        var timer  = new Timer(),
            phrase = 'CREATE TABLE IF NOT EXISTS ' + bucket + ' (key PRIMARY KEY, value TEXT)';
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
        if (typeof(options) === 'function') {
            next = options;
            options = {};
        }
        if (options.exact === false) {
            key = key.replace(/\*/g, '%');
        }
        var timer    = new Timer(),
            phrase   = 'SELECT ' + (options.exact === false ? 'key, ' : '') + 'value FROM ' + bucket + ' WHERE key ' +
            (options.exact === false ? 'LIKE' : '=') +  ' $key' +
            (options.limit ? ' LIMIT ' + options.limit : ''),
            selector = {$key:key};
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
                        rows[i].value = parse(rows[i].value);
                    }
                }
                next(err, rows, timer.elapsed(true));
            }
        });
    }
    
    function sqlUpsert(db, bucket, key, value, next) {
        var timer    = new Timer(),
            phrase   = 'INSERT OR REPLACE INTO ' + bucket + ' (key, value) VALUES ($key, $value)',
            document = {$key:key, $value:JSON.stringify(value)};
        
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
            if (next) next(err, result, timer.elapsed(true));
        });
    }
    
    function sqlDelete(db, bucket, key, next) {
        var timer    = new Timer(),
            phrase   = 'DELETE FROM ' + bucket + ' WHERE key = $key',
            selector = {$key:key};
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
                next(err, result, timer.elapsed(true));
            }
        });
    }
    

    return Database;
}();
