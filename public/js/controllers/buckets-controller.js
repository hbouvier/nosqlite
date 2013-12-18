angular.module('nosqliteBucketsControllers', ['nosqliteServices'])
.controller('BucketsCtrl', function($scope, $routeParams, $http, breadcrumbsService) {
    var baseURL = '/nosqlite/api/v1';
    $scope.buckets = [];
    
    breadcrumbsService.set('breadcrumbsID', [
        {
            href: '#/databases/',
            label: 'Databases'
        },
        {
            href: '#/databases/' + $scope.database,
            label: $scope.database
        }
    ]);
    $scope.database = $routeParams.database;
    $http( {
            method: 'GET',
            url: encodeURI(baseURL + '/' + $scope.database)
    }).
    success(function(data, status, headers, config) {
        $scope.buckets = data.buckets;
    }).
    error(function(data, status, headers, config) {
        $scope.buckets = [];
    });
    
    $scope.create = function (name) {
        $http( {
                method: 'POST',
                url: encodeURI(baseURL + '/' + $scope.database + '/' + name)
        }).
        success(function(data, status, headers, config) {
            $scope.buckets.push(name);
        }).
        error(function(data, status, headers, config) {
        });
    };
    
    
    
});
