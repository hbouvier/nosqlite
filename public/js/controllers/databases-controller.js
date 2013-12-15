angular.module('nosqliteControllers', [])
.controller('DatabasesCtrl', function($scope, $http) {
    var baseURL = '/nosqlite/v1';
    $scope.databases = {};
    
    $http( {
            method: 'GET',
            url: baseURL
    }).
    success(function(data, status, headers, config) {
        data.databases.forEach(function(database){
            $scope.databases[database] = {
                name:database
            };
            $http( {
                    method: 'GET',
                    url: baseURL + '/' + database
            }).
            success(function(data, status, headers, config) {
                $scope.databases[database].buckets = data.buckets;
            }).
            error(function(data, status, headers, config) {
                $scope.databases[database].buckets = [];
            });
        });
    }).
    error(function(data, status, headers, config) {
        $scope.databases = [];
    });
})
;
