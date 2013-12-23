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
        this.dbOpen      = false;
        this.fileOpenned = false;

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
            timer    = new Timer(),
            deferred = Q.defer();


        if (this.inMemory) {
            this.sqlite = new sqlite3.Database(this.database, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, function (err, result) {
                $this.logger.log(err ? 'error' : 'info', {
                    method:'open',
                    database: $this.database
                }, {
                    err:err,
                    result:result,
                    elapsedSecMsNanoInMs:timer.end().elapsed(true)
                }, meta);
                if (err) return deferred.reject(err, result, timer.elapsed(true));
                $this.dbOpen      = true;
                $this.fileOpenned = true;
                return deferred.resolve(result, timer.elapsed(true));
            });
        } else {
            fs.exists(this.database + '.nosql', function (exists) {
                var mode = sqlite3.OPEN_READWRITE | (exists ? 0 : sqlite3.OPEN_CREATE );
                $this.sqlite = new sqlite3.Database($this.database + ".nosql", mode, function (err, result) {
                    $this.logger.log(err ? 'error' : 'info', {
                        method:'open',
                        database: $this.database
                    }, {
                        err:err,
                        result:result,
                        elapsedSecMsNanoInMs:timer.end().elapsed(true)
                    }, meta);
                    if (err) return deferred.reject(err, result, timer.elapsed(true));
                    $this.dbOpen      = true;
                    $this.fileOpenned = true;
                    deferred.resolve(result, timer.elapsed(true));
                });
            });
        }
        return deferred.promise;
    };

    Database.prototype.close = function () {
        var $this    = this,
            timer    = new Timer(),
            deferred = Q.defer();
        if ($this.sqlite) {
            $this.sqlite.close(function (err, result) {
                $this.logger.log(err ? 'error' : 'info', {
                    method:'close',
                    database: $this.database
                }, {
                    err:err,
                    result:result,
                    elapsedSecMsNanoInMs:timer.end().elapsed(true)
                }, meta);
                if (err) return deferred.reject(err, result, timer.elapsed(true));
                $this.dbOpen = false;
                deferred.resolve(result, timer.elapsed(true));
            });
        } else {
            deferred.reject(new Error('Database has not been openned'), null, timer.end().elapsed(true));
        }
        return deferred.promise;
    };

    Database.prototype.delete = function () {
        var $this    = this,
            timer    = new Timer(),
            deferred = Q.defer();

        function logResult(err, result) {
            $this.logger.log(err ? 'error' : 'info', {
                method:'delete',
                database: $this.database
            }, {
                err:err,
                result:result,
                elapsedSecMsNanoInMs:timer.end().elapsed(true)
            }, meta);
            if (err)  return deferred.reject(err, result, timer.elapsed(true));
            $this.fileOpenned = false;
            return deferred.resolve(null, timer.elapsed(true));
        }

        if ($this.dbOpen) logResult(new Error("Database is open"), null);
        else if ($this.fileOpenned === false) logResult(new Error("Database needs to be openned and closed before it can be deleted"), null);
        else if (this.inMemory) {
            logResult(null, null);
        } else {
            fs.unlink($this.database + ".nosql", function (err, result) {
                logResult(err, result);
            });
        }
        return deferred.promise;
    };

    Database.prototype.create = function (bucket) {
        var $this    = this,
            deferred = Q.defer();

        if ($this.sqlite) {
            sqlCreate($this, bucket, function (err, result) {
                if (err) return deferred.reject(err);
                deferred.resolve(new Bucket($this, bucket));
            });
        } else {
            deferred.reject(new Error("Database has not been openned"));
        }
        return deferred.promise;
    };

    Database.prototype.drop = function (bucket) {
        var $this    = this,
            deferred = Q.defer();
        if ($this.sqlite) {
            sqlDrop($this, bucket, function (err, result) {
                if (err) return deferred.reject(err);
                deferred.resolve();
            });
        } else {
            deferred.reject(new Error("Database has not been openned"));
        }

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

        if (this.db.sqlite) {
            sqlUpsert(this.db, this.name, key, value, function (err, result, elapsed) {
                if (err) return deferred.reject(err, result, elapsed);
                return deferred.resolve(result, elapsed);
            });
        } else {
            deferred.reject(new Error("Database has not been openned"));
        }

        return deferred.promise;
    };

    Bucket.prototype.get = function (key, options) {
        var deferred = Q.defer();
        if (this.db.sqlite) {
            options = options || {exact:true, limit:2, offset:0};
            options.exact = isdef(options.exact) ? istrue(options.exact) : true;
            options.limit = options.limit || (options.exact ? 2 : 1000);
            sqlSelect(this.db, this.name, key, options, function (err, rows, elapsed) {
                if (err || !rows) return deferred.reject(err, rows, elapsed);
                if (rows.length === 0) return deferred.resolve(null, elapsed);
                if (options.exact === true) return rows.length === 1 ? deferred.resolve(rows[0], elapsed) : deferred.reject(new Error("Multiple Matches (" + rows.length +")"), rows, elapsed);
                return deferred.resolve(rows, elapsed);
            });
        } else {
            deferred.reject(new Error("Database has not been openned"));
        }
        return deferred.promise;
    };

    Bucket.prototype.del = function (key) {
        var deferred = Q.defer();
        if (this.db.sqlite) {
            sqlDelete(this.db, this.name, key, function (err, result, elapsed) {
                if (err) return deferred.reject(err, result, elapsed);
                return deferred.resolve(result, elapsed);
            });
        } else {
            deferred.reject(new Error("Database has not been openned"));
        }
        return deferred.promise;
    };

    //////////////////////////////////// PRIVATE ///////////////////////////////

    function sqlCreate(db, bucket, next) {
        var timer  = new Timer(),
            phrase = 'CREATE TABLE IF NOT EXISTS ' + bucket + ' (id PRIMARY KEY, rev TEXT, value TEXT)';
        db.sqlite.run(phrase, function (err, result) {
            db.logger.log(err ? 'error' : 'info', {
                method:'create',
                database: db.database,
                bucket: bucket,
                phrase:phrase
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
                phrase:phrase
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
            selector = {$id:key};
        } else {
            selector = {$id:key.id, $rev:key.rev};
        }

        if (options.exact === false) {
            selector.$id = selector.$id.replace(/\*/g, '%');
        }

        var phrase   = 'SELECT id, rev, value FROM ' + bucket + ' WHERE id ' +
            (options.exact === false ? 'LIKE' : '=') +  ' $id' +
            (selector.$rev ? ' AND rev = $rev' : '') +
            (options.limit ? ' LIMIT ' + options.limit : '') +
            (options.offset ? ' OFFSET ' + options.offset : '');

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
                        rows[i] = {
                            key:{
                                id:rows[i].id,
                                rev:rows[i].rev
                                },
                            value:parseIfJson(rows[i].value)
                        };
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
            update,
            phrase,
            select = 'SELECT id, rev, value FROM ' + bucket + ' WHERE id = $id AND rev = $rev LIMIT 1';

        if (typeof(key) !== 'object') {
            phrase = 'INSERT OR REPLACE INTO ' + bucket + ' (id, rev, value) VALUES ($id, $rev, $value)';
            document = {$id:key, $rev:uuid.v1(), $value:stringyIfObject(value)};
            update = false;
        } else {
            document = {$id:key.id, $origrev:key.rev, $rev:uuid.v1(), $value:stringyIfObject(value)};
            phrase = 'UPDATE ' + bucket + ' SET id=$id, rev=$rev, value=$value WHERE rev = $origrev';
            update = true;
        }

        db.sqlite.serialize(function () {
            var upsertErr;
            db.sqlite.run(phrase, document, function (err, result) {
                if (err) {
                    db.logger.log('error', {
                        method:update ? 'update' : 'replace',
                        database: db.database,
                        bucket: bucket,
                        phrase:phrase,
                        document:document
                    }, {
                        err:err,
                        result:result
                    }, meta);
                    upsertErr = err;
                }
            });
            db.sqlite.all(select, {$id:document.$id,$rev:document.$rev}, function (err, rows) {
                db.logger.log(err ? 'error' : 'info', {
                    method:update ? 'update' : 'replace',
                    database: db.database,
                    bucket: bucket,
                    phrase:phrase,
                    select:select,
                    document:document
                }, {
                    err:err,
                    upsertErr : upsertErr,
                    rows:rows,
                    elapsedSecMsNanoInMs:timer.end().elapsed(true)
                }, meta);
                if (next) {
                    if (upsertErr) return next(upsertErr, rows, timer.elapsed(true));
                    if (err) return next(err, rows, timer.elapsed(true));
                    if (!rows || rows.length !== 1) return next(new Error({Error:'SQLITE_ERROR: document has been modified by another statement', errno: 1, code: 'SQLITE_ERROR'}), null, timer.elapsed(true));
                    rows[0] = {
                        key:{
                            id:rows[0].id,
                            rev:rows[0].rev
                            },
                        value:parseIfJson(rows[0].value)
                    };
                    next(null, rows[0], timer.elapsed(true));
                }
            });
        });
    }

    function sqlDelete(db, bucket, key, next) {
        var timer    = new Timer(),
            phrase   = 'DELETE FROM ' + bucket + ' WHERE id = $id',
            selector;

        if (typeof(key) !== 'object') {
            selector = {$id:key};
        } else {
            selector = {$id:key.id, $rev:key.rev};
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
                next(err, {key:{id:selector.$id,rev:selector.$rev}, value:null}, timer.elapsed(true));
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
