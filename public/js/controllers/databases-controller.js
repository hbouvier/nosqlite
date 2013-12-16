angular.module('nosqliteControllers', [])
.controller('DatabasesCtrl', function($scope, $http) {
    var baseURL = '/nosqlite/v1';
    $scope.databases = {};
    $scope.databaseName;
    
    $scope.create = function (name) {
        if ($scope.databases[name])
            return;
        $http( {
                method: 'POST',
                url: encodeURI(baseURL + '/' + name)
        }).
        success(function(data, status, headers, config) {
            $scope.databases[name] = {name:name};
            fetchBuckets(name);
        }).
        error(function(data, status, headers, config) {
        });
    };
    
    $http( {
            method: 'GET',
            url: encodeURI(baseURL)
    }).
    success(function(data, status, headers, config) {
        data.databases.forEach(function(database){
            $scope.databases[database] = {
                name:database
            };
            fetchBuckets(database);
        });
    }).
    error(function(data, status, headers, config) {
        $scope.databases = [];
    });
    
    function fetchBuckets(database) {
        $http( {
                method: 'GET',
                url: encodeURI(baseURL + '/' + database)
        }).
        success(function(data, status, headers, config) {
            $scope.databases[database].buckets = data.buckets;
        }).
        error(function(data, status, headers, config) {
            $scope.databases[database].buckets = [];
        });

    }
})
;
