angular.module('nosqliteBucketsControllers', ['nosqliteServices'])
.controller('BucketsCtrl', function($scope, $routeParams, $http, breadcrumbsService) {
    var baseURL = '/nosqlite/v1';
    
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
});
