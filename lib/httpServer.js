module.exports = function () {
    var express = require('express'),
        connect = require('connect'),
        app     = express(),
        server  = require('http').createServer(app),
        logger  = null,
        meta    = { 
            "module" : "httpServer",
            "pid"    : process.pid
        };

    /**
     * Start the Web Server to provide both the HTML frontend and the JSON Web
     * service.
     * 
     * @param options an object containing two properties :
     *          options.ui:      for the web ui (e.g. http://ui)
     *          options.api:     for the service (e.g. http://api)
     *          options.port:    The port on which the server will listen to
     */
    function start(options) {
        logger = options.logger;
        logger.log('debug', "options=%j", options, meta);
        
        ////////////////////////////////////////////////////////////////////////
        //
        // Express configuration for ALL environment
        //
        app.configure(function () {
            app.use(express.logger('dev'));
            app.use(connect.urlencoded());
            app.use(readRawBody); //app.use(connect.json());
            app.use(function(req, res, next) { //CORS middleware
                res.setHeader('Access-Control-Allow-Origin', "*");
                res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                return next();
            });
            app.use(fixQueryParams);
            app.use(app.router);
            if (options.ui) {
                app.use(options.ui, express.static(__dirname + '/../public'));
            }
            app.use(function (req, res, next) {
                res.setHeader('Content-Type', 'application/json;charset=UTF-8');
                return next();
            });
            app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
        });
        
        
        require('./routes')(app, options);
    
        server.listen(options.port);
        logger.log('verbose', 'Listening|port=%d', options.port, meta);
    }


    function readRawBody(req, res, next) {
        var data  = '',
            regex = /^\s*(\w+\/\w+)(?:\s*;\s*(\w+)\s*=\s*["']?([^'"]*)["']?)?/i;


        req.setEncoding('utf8');
        req.on('data', function(chunk) {
            data += chunk;
        });

        req.on('end', function() {
            var contentType = req.get('Content-Type'),
                match = regex.exec(contentType);
            if (match && match.length >= 2) {
                if (match[1].toLowerCase() === 'application/json') {
                    try {
                        req.body = JSON.parse(data);
                        logger.log('info', 'Content-type=JSON', meta);
                    } catch (e) {
                        logger.log('debug', {"Content-type" : match[1].toLowerCase(),
                                             "body" : data,
                                             "exception" : e}, meta);
                        req.body = data;
                    }
                } else if (/^text\//.exec(match[1].toLowerCase())) {  // text/plain, text/html, text/css, text/...
                    logger.log('info', 'Content-type=TEXT', meta);
                    req.body = data;
                } else {
                    logger.log('info', 'Content-type=UNKNOWN', meta);
                    req.body = data;
                }
            } else {
                logger.log('info', 'Content-type=NONE', meta);
                req.body = data;
            }
            return next();
        });
    }

    function fixQueryParams(req, res, next) {
        console.log('params:', req.params);
        for (var p in req.params) {
            if (req.params.hasOwnProperty(p)) {
                logger.log('info', 'params[%s]=%j', p, req.params[p], meta);
                try {
                    req.params[p] = JSON.parse(req.params[p]);
                } catch (e) {
                }
            }
        }
        console.log('query:', req.query);
        for (var q in req.query) {
            if (req.query.hasOwnProperty(1)) {
                logger.log('info', 'query[%s]=%j', p, req.query[q], meta);
                try {
                    req.query[q] = JSON.parse(req.query[q]);
                } catch (e) {
                }
            }
        }
        return next();
    }


    return {
        "start"    : start
    };
}();