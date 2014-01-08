module.exports = function () {
    var Q       = require('q'),
        sqlite3 = require('sqlite3'),
        fs      = require('fs'),
        winston = require('winston'),
        uuid    = require('node-uuid'),
        db      = [],
        trxID   = 0,
        mime    = {
            json    : 'application/json; charset="UTF-8"',
            text    : 'text/plain; charset="UTF-8"',
            xml     : 'text/xml; charset="UTF-8"',             // application/xml
            unknown : 'unknown/unknown; charset="UTF-8"'
        },
        meta    = {
            "module" : "nosqlite"
        };

    ////////////////////////////////////////////////////////////////////////////

    /**
     * CTOR: Database
     *
     * database: name of the file or ':memory:'
     * options:
     *          - level   : debug|verbose|info|warn|error
     *          - journal : true|false
     *
     */
    function Database(database, options) {
        this.mime = mime;

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

    /**
     * Open
     *
     */
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

                sqliteImpl.upgrade($this).then(function () {
                    $this.dbOpen      = true;
                    $this.fileOpenned = true;
                    deferred.resolve(result, timer.elapsed(true));
                }).fail(function (reason) {
                    $this.close().then(function () {
                        deferred.reject(reason, null, timer.elapsed(true));
                    }).fail(function () {
                        deferred.reject(reason, null, timer.elapsed(true));
                    }).done();
                }).done();
            });
        } else {
            fs.exists(this.database + '.nosql', function (exists) {
                var mode = sqlite3.OPEN_READWRITE | (exists ? 0 : sqlite3.OPEN_CREATE );
                $this.sqlite = new sqlite3.Database($this.database + ".nosql", mode, function (err, result) {
                    $this.logger.log(err ? 'error' : 'info', {
                        method:'open',
                        database: $this.database  + ".nosql"
                    }, {
                        err:err,
                        result:result,
                        elapsedSecMsNanoInMs:timer.end().elapsed(true)
                    }, meta);

                    if (err) return deferred.reject(err, result, timer.elapsed(true));
                    db.push($this);
                    sqliteImpl.upgrade($this).then(function () {
                        $this.dbOpen      = true;
                        $this.fileOpenned = true;
                        deferred.resolve(result, timer.elapsed(true));
                    }).fail(function (reason) {
                        $this.close().then(function () {
                            deferred.reject(reason, null, timer.elapsed(true));
                        }).fail(function () {
                            deferred.reject(reason, null, timer.elapsed(true));
                        }).done();
                    }).done();
                });
            });
        }
        return deferred.promise;
    };

    /**
     * close
     *
     */
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
                for (var i = 0 ; i < db.length ; ++i) {
                    if (db[i] === $this) {
                        db.splice(i, 1);
                        break;
                    }
                }
                if (err) return deferred.reject(err, result, timer.elapsed(true));
                $this.dbOpen = false;
                deferred.resolve(result, timer.elapsed(true));
            });
        } else {
            deferred.reject(new Error('Database has not been opened'), null, timer.end().elapsed(true));
        }
        return deferred.promise;
    };

    /**
     * delete
     *
     * Remove the database file from disk (or memory)
     *
     */
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
        else if ($this.fileOpenned === false) logResult(new Error("Database needs to be opened and closed before it can be deleted"), null);
        else if (this.inMemory) {
            logResult(null, null);
        } else {
            fs.unlink($this.database + ".nosql", function (err, result) {
                logResult(err, result);
            });
        }
        return deferred.promise;
    };

    /**
     * create
     *
     * Create the database
     */
    Database.prototype.create = function (bucket) {
        var $this    = this,
            deferred = Q.defer();
        sqliteImpl.create($this, bucket).then(function (elapsed) {
            deferred.resolve(new Bucket($this, bucket), elapsed);
        }).fail(function (reason, elapsed) {
            deferred.reject(reason, elapsed);
        }).done();
        return deferred.promise;
    };


    /**
     * list
     *
     */
    Database.prototype.list = function () {
        return sqliteImpl.tables(this, {});
    };

    /**
     * bucket
     *
     */

    Database.prototype.bucket = function (bucket) {
        return new Bucket(this, bucket);
    };

    ////////////////////////////////////////////////////////////////////////////

    function Bucket(db, name) {
        this.db      = db;
        this.name    = name;
        this.mime    = mime;
    }

    Bucket.prototype.getName = function () { return this.name; };


    Bucket.prototype.set = function (key, value, contentType) {
        contentType = getContentType(value, contentType);
        return sqliteImpl.upsert(this.db, this.name, key, value, contentType);
    };

    Bucket.prototype.get = function (key, options) {
        var deferred = Q.defer();
        options = options || {exact:true, limit:2, offset:0};
        options.exact = isdef(options.exact) ? istrue(options.exact) : true;
        options.limit = options.limit || (options.exact ? 2 : 1000);
        sqliteImpl.select(this.db, this.name, key, options).then (function (rows, elapsed) {
            if (rows.length === 0) return deferred.resolve(null, elapsed);
            if (options.exact === true) return rows.length === 1 ? deferred.resolve(rows[0], elapsed) : deferred.reject(new Error("Multiple Matches (" + rows.length +")"), rows, elapsed);
            return deferred.resolve(rows, elapsed);
        }).fail(function (reason, elapsed) {
            deferred.reject(reason, elapsed);
        }).done();
        return deferred.promise;
    };

    Bucket.prototype.count = function (key, options) {
        if ((typeof(key) === 'object' && !key.id) || (!key && !options)) {
            options = key;
            key = "%";
            options = options || {};
            options.exact = false;
        }
        options = options || {exact:true, limit:1, offset:0};
        options.exact = isdef(options.exact) ? istrue(options.exact) : true;
        options.limit = options.limit || (options.exact ? 2 : 1000);
        return sqliteImpl.count(this.db, this.name, key, options);
    };


    Bucket.prototype.del = function (key, options) {
        options = options || {exact:true, limit:1, offset:0};
        return sqliteImpl.delete(this.db, this.name, key, options);
    };

    /**
     *  drop
     *
     */
    Bucket.prototype.drop = function () {
        return sqliteImpl.drop(this.db, this.name);
    };


    //////////////////////////////////// PRIVATE ///////////////////////////////


    var sqliteImpl = (function () {
        var statementQueue         = [];
        var statementExecutorBusy  = false;

        function sqlCreate(db, bucket) {
            var deferred = Q.defer();
            if (!db || !db.sqlite) {
                deferred.reject(new Error("Database has not been opened"));
                return deferred.promise;
            }
            var phrase = 'CREATE TABLE IF NOT EXISTS ' + bucket + ' (id PRIMARY KEY, rev TEXT, value TEXT, contentType TEXT)';
            sql(db, bucket, [ {
                    level     : 'info',
                    method    : 'create',
                    options   : null,
                    phrase    : phrase,
                    document  : null
            }]).then(function (results, elapsed) {
                deferred.resolve(elapsed);
            }).fail(function (reasons, elapsed) {
                deferred.reject(reasons, elapsed);
            }).done();
            return deferred.promise;
        }

        function sqlDrop(db, bucket) {
            var deferred = Q.defer();
            if (!db || !db.sqlite) {
                deferred.reject(new Error("Database has not been opened"));
                return deferred.promise;
            }
            var phrase = 'DROP TABLE IF EXISTS ' + bucket;
            sql(db, bucket, [ {
                    level     : 'info',
                    method    : 'drop',
                    options   : null,
                    phrase    : phrase,
                    document  : null
            }]).then(function (results, elapsed) {
                deferred.resolve(elapsed);
            }).fail(function (reasons, elapsed) {
                deferred.reject(reasons, elapsed);
            }).done();
            return deferred.promise;
        }

        function sqlCount(db, bucket, key, options) {
            var deferred = Q.defer();
            if (!db || !db.sqlite) {
                deferred.reject(new Error("Database has not been opened"));
                return deferred.promise;
            }
            var selector = _getSelector(key, options);
            var phrase   = 'SELECT count(*) as count FROM ' + bucket + ' WHERE id ' +
                (options.exact === false ? 'LIKE' : '=') +  ' $id' +
                (selector.$rev ? ' AND rev = $rev' : '');
            sql(db, bucket, [ {
                    level     : 'info',
                    method    : 'count',
                    options   : options,
                    phrase    : phrase,
                    document  : selector
            }]).then(function (results, elapsed) {
                var rows = results[0];
                var count  = (rows && rows.length === 1) ? rows[0].count : 0;
                deferred.resolve(count, elapsed);
            }).fail(function (reasons, elapsed) {
                deferred.reject(reasons, elapsed);
            }).done();
            return deferred.promise;
        }




        function sqlSelect(db, bucket, key, options) {
            var deferred = Q.defer();
            if (!db || !db.sqlite) {
                deferred.reject(new Error("Database has not been opened"));
                return deferred.promise;
            }
            var selector = _getSelector(key, options);
            var phrase   = 'SELECT id, rev, value, contentType FROM ' + bucket + ' WHERE id ' +
                (options.exact === false ? 'LIKE' : '=') +  ' $id' +
                (selector.$rev ? ' AND rev = $rev' : '') +
                (options.limit ? ' LIMIT ' + options.limit : '') +
                (options.offset ? ' OFFSET ' + options.offset : '');
            sql(db, bucket, [ {
                    level     : 'info',
                    method    : 'select',
                    options   : options,
                    phrase    : phrase,
                    document  : selector
            }]).then(function (results, elapsed) {
                var rows = results[0]; // 0 = SELECT
                if (rows && rows.length > 0) {
                    for (var i = 0 ; i < rows.length ; ++i) {
                        rows[i] = {
                            key:{
                                id:rows[i].id,
                                rev:rows[i].rev
                            },
                            contentType : rows[i].contentType,
                            value: getValue(rows[i].contentType, rows[i].value)
                        };
                    }
                }
                deferred.resolve(rows, elapsed);
            }).fail(function (reasons, elapsed) {
                deferred.reject(reasons, elapsed);
            }).done();
            return deferred.promise;
        }

        function sqlUpsert(db, bucket, key, value, contentType) {
            var deferred = Q.defer();
            if (!db || !db.sqlite) {
                deferred.reject(new Error("Database has not been opened"));
                return deferred.promise;
            }
            var document,
                statements = [];
            if (typeof(key) === 'object') {
                document = {
                    $id          : key.id,
                    $origrev     : key.rev,
                    $rev         : uuid.v1(),
                    $value       : setValue(contentType, value),
                    $contentType : contentType}
                ;
                statements.push( {
                    level     : 'info',
                    method    : 'update',
                    options   : null,
                    phrase    : 'UPDATE ' + bucket + ' SET id=$id, rev=$rev, value=$value, contentType=$contentType WHERE rev = $origrev',
                    document  : document
                });
            } else {
                document = {
                    $id          : key,
                    $rev         : uuid.v1(),
                    $value       : setValue(contentType, value),
                    $contentType : contentType
                };
                statements.push( {
                    level     : 'info',
                    method    : 'insert',
                    options   : null,
                    phrase    : 'INSERT OR REPLACE INTO ' + bucket + ' (id, rev, value, contentType) VALUES ($id, $rev, $value, $contentType)',
                    document  : document
                });
            }
            statements.push({
                level     : 'debug',
                method    : 'select',
                options   : null,
                phrase    : 'SELECT id, rev, value, contentType FROM ' + bucket + ' WHERE id = $id AND rev = $rev LIMIT 1',
                document  : {$id:document.$id, $rev:document.$rev}
            });

            sql(db, bucket, statements).then(function (results, elapsed) {
                var rows = results[2] // 0 = BEGIN, 1 = INSERT/UPDATE, 2 = SELECT, 3 = COMMIT/ROLLBACK
                if (!rows || rows.length !== 1) return deferred.reject(new Error({Error:'SQLITE_ERROR: document has been modified by another statement', errno: 1, code: 'SQLITE_ERROR'}), elapsed);
                rows[0] = {
                    key:{
                        id:rows[0].id,
                        rev:rows[0].rev
                    },
                    contentType : rows[0].contentType,
                    value       : getValue(rows[0].contentType, rows[0].value)
                };
                deferred.resolve(rows[0], elapsed);
            }).fail(function (reasons, elapsed) {
                deferred.reject(reasons, elapsed);
            }).done();
            return deferred.promise;
        }

        function sqlDelete(db, bucket, key, options) {
            var deferred = Q.defer();
            if (!db || !db.sqlite) {
                deferred.reject(new Error("Database has not been opened"));
                return deferred.promise;
            }
            var selector = _getSelector(key, options),
                phrase   = 'DELETE FROM ' + bucket + ' WHERE id ' +
                           (options.exact === false ? 'LIKE' : '=') +  ' $id' +
                           ((options.exact && selector.$rev) ? ' AND rev = $rev' : '');
            sql(db, bucket, [ {
                    level     : 'info',
                    method    : 'delete',
                    options   : null,
                    phrase    : phrase,
                    document  : selector
            }]).then(function (results, elapsed) {
                deferred.resolve({key:{id:selector.$id,rev:selector.$rev}, value:null}, elapsed);
            }).fail(function (reasons, elapsed) {
                deferred.reject(reasons, elapsed);
            }).done();
            return deferred.promise;
        }

        function sqlTables(db, options) {
            var deferred = Q.defer();
            if (!db || !db.sqlite) {
                deferred.reject(new Error("Database has not been opened"));
                return deferred.promise;
            }
            var phrase   = "SELECT name"
                         + (options.schema ? ", sql " : " ")
                         + "FROM sqlite_master WHERE type=$table ORDER BY name",
                selector = { $table : 'table' };

            sql(db, null, [ {
                    level     : 'info',
                    method    : '.tables',
                    options   : null,
                    phrase    : phrase,
                    document  : selector
            }]).then(function (results, elapsed) {
                var buckets = results[0];
                deferred.resolve(buckets, elapsed);
            }).fail(function (reasons, elapsed) {
                deferred.reject(reasons, elapsed);
            }).done();
            return deferred.promise;
        }

        function sqlUpgrade(db) {
            var deferred = Q.defer();
            sqlTables(db, {schema:true}).then(function (rows, elapsed) {
                var promises = [];
                var regex = /^CREATE TABLE\s+([^\s]*)\s+\(id PRIMARY KEY, rev TEXT, value TEXT\)$/;
                for (var i = 0 ; rows && i < rows.length ; ++i) {
                    var matches = regex.exec(rows[i].sql);
                    if (matches && matches.length === 2) {
                        var phrase   = "ALTER TABLE " + matches[1] + " ADD COLUMN contentType TEXT",
                            selector = null; // { $table : matches[1] };

                        promises.push(sql(db, null, [ {
                            level     : 'info',
                            method    : 'alter',
                            options   : null,
                            phrase    : phrase,
                            document  : selector
                        }]));
                    }
                }
                if (promises.length === 0) {
                    deferred.resolve();
                } else {
                    Q.all(promises).then(function (results) {
                        deferred.resolve();
                    }).fail(function (reasons) {
                        deferred.reject(reasons);
                    }).done();
                }
            }).fail(function (reason, elapsed) {
                deferred.reject(reason);
            }).done();
            return deferred.promise;
        }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        function _getSelector(key, options) {
            var selector = typeof(key) === 'object' ? {$id:key.id, $rev:key.rev} : {$id:key};
            if (options.exact === false) {
                selector.$id = selector.$id.replace(/\*/g, '%');
            }
            return selector;
        }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        function sql(db, bucket, statements) {
            var deferred = Q.defer();
            db.logger.log('debug', 'sql|db=%j|bucket=%j|statements=%j|queue=%j', db,bucket, statements, statementQueue, meta);
            statementQueue.push({deferred: deferred, db:db, bucket:bucket, statements:statements});
            if (!statementExecutorBusy) {
                statementExecutorBusy = true;
                process.nextTick(_sqlProcessNextStatement);
            }
            return deferred.promise;
        }

        /**
         * Run a serie of SQL statements within a transaction
         *
         */
        function sqliteAll(db, phrase, document, id) {
            var timer    = new Timer(),
                deferred = Q.defer();

            function callback (err, result) {
                if (err) {
                    db.logger.log('error', {id:id, phrase:phrase, document:document}, {err:err, elapsedSecMsNanoInMs:timer.end().elapsed(true)}, meta);
                    deferred.reject(err, timer.elapsed(true));
                } else {
                    db.logger.log('info', {id:id, phrase:phrase, document:document}, {result:result, elapsedSecMsNanoInMs:timer.end().elapsed(true)}, meta);
                    deferred.resolve(result, timer.elapsed(true));
                }
            }
            if (document)
                db.sqlite.all(phrase, document, callback);
            else
                db.sqlite.all(phrase, callback);
            return deferred.promise;
        }


        function _sqlProcessNextStatement() {
            var timer       = new Timer(),
                promises    = [],
                transaction = statementQueue.pop(),
                deferred    = transaction.deferred,
                db          = transaction.db;
            ++trxID;
            db.logger.log('debug', '_sqlProcessNextStatement|processing|statements=%j', transaction.statements, meta);

            function next() {
                if (statementQueue.length > 0) {
                    process.nextTick(_sqlProcessNextStatement);
                } else {
                    statementExecutorBusy = false;
                }
            }
            function execute(id, statement) {
                return sqliteAll(db, statement.phrase, statement.document, trxID + '.' +id);
            }

            db.sqlite.serialize(function () {
                if (transaction.statements.length > 1) {
                    promises.push(sqliteAll(db, 'BEGIN', null, trxID + "." + 0));
                }
                for (var i = 0 ; i < transaction.statements.length ; ++i) {
                    promises.push(execute(i+1, transaction.statements[i]));
                }
            });
            Q.all(promises).then(function (results) {
                if (transaction.statements.length > 1) {
                    sqliteAll(db, 'COMMIT', null, trxID + '.' +(transaction.statements.length+1)).then(function (result) {
                        results.push(result);
                        deferred.resolve(results, timer.end().elapsed(true));
                        next();
                    }).fail(function (commiterr) {
                        deferred.reject(commiterr, timer.end().elapsed(true));
                        next();
                    }).done();
                } else {
                    deferred.resolve(results, timer.end().elapsed(true));
                    next();
                }
            }).fail(function (err) {
                if (transaction.statements.length > 1) {
                    sqliteAll(db, 'ROLLBACK', null, trxID + '.' +(transaction.statements.length+1)).then(function () {
                        deferred.reject(err, timer.end().elapsed(true));
                        next();
                    }).fail(function (rollbackerr) {
                        deferred.reject(err, timer.end().elapsed(true));
                        next();
                    }).done();
                } else {
                    deferred.reject(err, timer.end().elapsed(true));
                    next();
                }
            }).done();
            return deferred.promise;
        }

        return {
            create  : sqlCreate,
            drop    : sqlDrop,
            count   : sqlCount,
            select  : sqlSelect,
            delete  : sqlDelete,
            upsert  : sqlUpsert,
            tables  : sqlTables,
            upgrade : sqlUpgrade
        };
    })();


    ////////////////////////////  CLEAN UP /////////////////////////////////////

    process.on( 'SIGINT', function() {
        var promises = [];
        for (var i = 0 ; i < db.length ; ++i) {
            promises.push(db[i].close());
        }

        Q.all(promises).done(function () {
            process.exit();
        });
    });



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

    function toType(obj) {
        return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
    }

    function getValue(contentType, value) {
        if (contentType.match(/^text\//) && value.charAt(0) !== '{' && value.charAt(0) !== '[' ) {
            value = parseIfJson(value);
        } else if (contentType.match(/^application\/json/)) {
            value = parseIfJson(value);
        }
        return value;
    }
    function setValue(contentType, value) {
        if (contentType.match(/^application\/json/)) {
            value = stringyIfObject(value);
        } else if (toType(value) === 'boolean') {
            value = stringyIfObject(value);
        }
        return value;
    }

    function getContentType(value, contentType) {
        if (!contentType) {
            switch (toType(value)) {
                case 'error':
                case 'date':
                case 'object':
                    contentType = mime.json;
                    break;
                case 'array':
                    contentType = mime.json;
                    break;
                case 'number':
                case 'boolean':
                case 'string':
                    contentType = mime.text;
                    break;
                case 'undefined':
                case 'function':
                case 'regexp':
                default:
                    contentType = mime.unknown;
                    break;
            }
        }
        return contentType;
    }

    return Database;
}();
