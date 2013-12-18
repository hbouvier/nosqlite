(function () {
    var fs      = require('fs'),
        path    = require('path'),
        winston = require('winston'),
        opts    = require('node-options'),
        options = JSON.parse(fs.readFileSync(path.join(path.dirname(fs.realpathSync(__filename)), '../package.json'))).configuration,
        logger  = null,
        meta    = { 
            "module" : "nosqlited",
            "pid"    : process.pid
        };
        
    function usage(errors) {
        logger.log('error', 'USAGE: %s --level=silly|verbose|info|warn|error --context=nosqlite --port=4200', meta.module, meta);
        if (errors) {
            logger.log('error', '       UNKNOWN ARGUMENTS: "%s"', errors.join('", "'), meta);
        }
    }
    
    function initLogger() {
        var log = new (winston.Logger)({ transports: [
            new (winston.transports.Console)({
                "level"    : options.level || "info",
                "json"     : false,
                "colorize" : true
            })
        ]});
        return log;
    }

    ////////////////////////////////////////////////////////////////////////////
    //
    // MAIN
    //
    // To run on PAAS like Heroku or Cloud9, the server has to use the port from
    // the environment. Here we overwrite the configuration/command line option
    // with the Enviroment Variable "PORT", only if it is defined.
    options.port    = process.env.PORT    || options.port;

    // The "options" parameter is an object read from the package.json file.
    // Every property of that object can be overwritten through the command
    // line argument (e.g. --"property"=newValue)
    var result = opts.parse(process.argv.slice(2), options);
    logger = initLogger();
    
    // If an argument was passed on the command line, but was not defined in
    // the "configuration" property of the package.json, lets print the USAGE.
    if (result.errors) {
        usage(result.errors);
        process.exit(-1);
    } else if (result.args.length > 0) {
        usage(result.args);
        process.exit(-1);
    }
    
    // If not, start as a Web Server. The server will provide both an HTML
    // frontend and a JSON Web Service.
    var server = require(__dirname + '/httpServer');
    server.start({
        "logger"  : logger,
        "port"    : options.port,
        "context" : options.context
    });
}).call();
