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
     *          options.context: The context (prefix on the URL)
     *          options.ui:      for the web ui (e.g. http://context/ui)
     *          options.api:     for the service (e.g. http://context/api)
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
            app.use(connect.json());
            app.use(function(req, res, next) { //CORS middleware
                res.setHeader('Access-Control-Allow-Origin', "*");
                res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                return next();
            });
            if (options.ui) {
                app.use(options.context + options.ui, express.static(__dirname + '/../public'));
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
    return {
        "start"    : start
    };
}();