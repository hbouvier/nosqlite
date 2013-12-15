angular.module('nosqliteDocumentsControllers', [])
.controller('DocumentsCtrl', function($scope, $routeParams, $http) {
    var baseURL = '/nosqlite/v1';
    $scope.documents = [];
    $scope.database = $routeParams.database;
    $scope.bucket   = $routeParams.bucket;
    $scope.id       = '1';

    $scope.find = function (id) {
        $http( {
            method: 'GET',
            url: '/nosqlite/v1/' + $scope.database + '/' + $scope.bucket + '/' + id
        }).
        success(function(data, status, headers, config) {
            $scope.documents.push({key:id, value:data});
        }).
        error(function(data, status, headers, config) {
        });
    };
    $scope.find($scope.id);
});
