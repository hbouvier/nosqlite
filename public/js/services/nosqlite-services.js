angular.module('nosqliteServices', [])
.filter('objectFilter', function(){
    return function(input, query){
        if(!query) return input;
        var result = [];

        angular.forEach(input, function(object){
            var copy = {};
            for (var i in object)
                // angular adds '$$hashKey' to the object. 
                if (object.hasOwnProperty && i !== '$$hashKey') copy[i] = object[i];
            if (JSON.stringify(copy).match(query)) {
                result.push(object);
            }
        });
        return result;
    };
})
/*
.factory('socket', function($rootScope) {
    var restDomain = document.domain,
        socket = io.connect(restDomain);
        return {
            on: function(eventName, callback) {
                socket.on(eventName, function() {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        callback.apply(socket, args);
                    });
                });
            },
            emit: function (eventName, data, callback) {
                socket.emit(eventName, data, function() {
                    var args = arguments;
                    $rootScope.$apply(function() {
                        if (callback)
                            callback.apply(socket, args);
                    });
                });
            }
        };
})
*/
;
