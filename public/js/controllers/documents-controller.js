angular.module('nosqliteDocumentsControllers', ['nosqliteServices'])
.controller('DocumentsCtrl', function($scope, $routeParams, $http, breadcrumbsService) {
    var baseURL = '/nosqlite/api/v1';
    $scope.documents = [];
    $scope.database = $routeParams.database;
    $scope.bucket   = $routeParams.bucket;
    $scope.id       = '*';

    breadcrumbsService.set('breadcrumbsID', [
        {
            href: '#/databases/',
            label: 'Databases'
        },
        {
            href: '#/databases/' + $scope.database,
            label: $scope.database
        },
        {
            href: '#/databases/' + $scope.database + '/' + $scope.bucket,
            label: $scope.bucket
        }
    ]);

    $scope.find = function (id) {
        $http( {
            method: 'GET',
            url: encodeURI(baseURL + '/' + $scope.database + '/' + $scope.bucket + '/' + id + '?exact=false')
        }).
        success(function(data, status, headers, config) {
            $scope.documents = data;
        }).
        error(function(data, status, headers, config) {
        });
    };
    $scope.find($scope.id);
});
