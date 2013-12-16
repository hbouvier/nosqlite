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
.factory('breadcrumbsService', function($rootScope, $log) {
    var data = {};
    var ensureIdIsRegistered = function(id) {
        if (angular.isUndefined(data[id])) {
            data[id] = [];
        }
    };
    return {
        
        set: function(id, items) {
            ensureIdIsRegistered(id);
            data[id] = items;
            // $log.log( "$broadcast" );
            $rootScope.$broadcast( 'breadcrumbsRefresh' );
        },
        push: function(id, item) {
            ensureIdIsRegistered(id);
            data[id].push(item);
            //$log.log( "$broadcast" );
            $rootScope.$broadcast( 'breadcrumbsRefresh' );
        },
        get: function(id) {
            ensureIdIsRegistered(id);
            return angular.copy(data[id]);
        },
        setLastIndex: function( id, idx ) {
            ensureIdIsRegistered(id);
            if ( data[id].length > 1+idx ) {
                data[id].splice( 1+idx, data[id].length - idx );
            }
        }
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
