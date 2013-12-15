angular.module('nosqliteBucketsControllers', [])
.controller('BucketsCtrl', function($scope, $routeParams, $http) {
    var baseURL = '/nosqlite/v1';
    $scope.database = $routeParams.database;
    $http( {
            method: 'GET',
            url: baseURL + '/' + $scope.database
    }).
    success(function(data, status, headers, config) {
        $scope.buckets = data.buckets;
    }).
    error(function(data, status, headers, config) {
        $scope.buckets = [];
    });
});
