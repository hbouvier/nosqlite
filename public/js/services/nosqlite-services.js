angular.module('nosqliteServices', ['ngResource'])
    .filter('objectFilter', function ($rootScope) {
        return function (input, query) {
            if (!query) return input;
            var result = [];

            angular.forEach(input, function (object) {
                var copy = {};
                var regex = new RegExp(query, 'im');
                for (var i in object) {
                    // angular adds '$$hashKey' to the object.
                    if (object.hasOwnProperty(i) && i !== '$$hashKey')
                        copy[i] = object[i];
                }
                if (JSON.stringify(copy).match(regex)) {
                    result.unshift(object);
                }
            });
            return result;
        };
    })
    .factory('breadcrumbsService', function ($rootScope, $log) {
        var data = {};
        var ensureIdIsRegistered = function (id) {
            if (angular.isUndefined(data[id])) {
                data[id] = [];
            }
        };
        return {

            set: function (id, items) {
                ensureIdIsRegistered(id);
                data[id] = items;
                // $log.log( "$broadcast" );
                $rootScope.$broadcast('breadcrumbsRefresh');
            },
            push: function (id, item) {
                ensureIdIsRegistered(id);
                data[id].push(item);
                //$log.log( "$broadcast" );
                $rootScope.$broadcast('breadcrumbsRefresh');
            },
            get: function (id) {
                ensureIdIsRegistered(id);
                return angular.copy(data[id]);
            },
            setLastIndex: function (id, idx) {
                ensureIdIsRegistered(id);
                if (data[id].length > 1 + idx) {
                    data[id].splice(1 + idx, data[id].length - idx);
                }
            }
        };
    })
    .factory('Database', function ($rootScope, $resource) {
        var impl = $resource(
            $rootScope.baseAPIurl + '/:database', // encodeURI()
            null,
            {
                "get"    : { method : "GET" },
                "delete" : { method : "DELETE" },
                "post"   : {
                    method : "POST",
                    "transformResponse" : function(data, headers) {
                        var contentType = headers('content-type') ? headers('content-type') : 'application/json';
                        if (contentType.match(/^application\/json/)) {
                            try { data = JSON.parse(data); } catch (e) {/*ignore*/}
                        }
                        data.databases = {};
                        impl.get({database:data.database}).$promise.then(function (buckets) {
                            data.databases[buckets.database] = {
                                name     : buckets.database,
                                selected : false,
                                buckets  : buckets.buckets
                            };
                        });
                        return data;
                    }
                },
                "list"  : {
                    "method" : "GET",
                    "transformResponse" : function(data, headers) {
                        var contentType = headers('content-type') ? headers('content-type') : 'application/json';
                        if (contentType.match(/^application\/json/)) {
                            try { data = JSON.parse(data); } catch (e) {/*ignore*/}
                        }
                        var databases = data.databases;
                        data.databases =  {};
                        angular.forEach(databases, function (database) {
                            impl.get({database:database}).$promise.then(function (buckets) {
                                data.databases[buckets.database] = {
                                    name     : buckets.database,
                                    selected : false,
                                    buckets  : buckets.buckets
                                };
                                console.log('Database:list|db-name=', buckets.database);
                            });
                        });
                        console.log('Database:list');
                        return data;
                    }
                }
            }
        );
        return impl;
    })
    .factory('Bucket', function ($rootScope, $resource) {
        var impl = $resource(
            $rootScope.baseAPIurl + '/:database/:bucket', // encodeURI()
            null,
            {
                "get"    : { method : "GET" },
                "delete" : { method : "DELETE" },
                "post"   : { method : "POST" },
                "list"  :  { method : "GET" }
            }
        );
        return impl;
    })
    .factory('Document', function ($rootScope, $resource) {
        return function (contentType) {
            var impl = $resource(
                $rootScope.baseAPIurl + '/:database/:bucket/:document', // encodeURI()
                null,
                {
                    "get"    : { method : "GET"},
                    "delete" : { method : "DELETE" },
                    "put"    : {
                        method : "PUT",
                        transformRequest : function (data, headersGetter) {
                            var headers = headersGetter();
                            if (contentType) {
                                headers['Content-Type'] = contentType;
                                console.log('content-type:', headers['Content-Type']);
                            }
                            return data;
                        }
                    },
                    "list"   : { method : "GET", isArray : true  }
                }
            );
            return impl;
        };
    })
    /*
     var restDomain = document.domain,
     .factory('socket', function($rootScope) {
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


