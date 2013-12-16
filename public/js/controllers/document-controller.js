angular.module('nosqliteDocumentControllers', ['nosqliteServices'])
.controller('DocumentCtrl', function($scope, $routeParams, $http, breadcrumbsService) {
    var baseURL = '/nosqlite/v1';
    $scope.database   = $routeParams.database;
    $scope.bucket     = $routeParams.bucket;
    $scope.documentId = $routeParams.documentId;
    $scope.document   = {};
    $scope.fields     = [];
    
    $scope.documentKEY  ='';
    $scope.documentJSON = '';

    $scope.save = function () {
        for (var i = 0 ; i < $scope.fields.length ; ++i) {
            $scope.document[$scope.fields[i].key] = $scope.fields[i].value;
        }
        
        
        $http( {
            method: 'PUT',
            url: encodeURI(baseURL + '/' + $scope.database + '/' + $scope.bucket + '/' + $scope.documentId),
            headers: {
                'Content-type': 'application/json'
            },
            data : $scope.document
        }).
        success(function(data, status, headers, config) {
            alert('SAVED');
        }).
        error(function(data, status, headers, config) {
            alert('ERROR');
        });
    };
    function updateBreadcrumbs() {
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
            },
            {
                href: '#/databases/' + $scope.database + '/' + $scope.bucket + '/' + $scope.documentId,
                label: $scope.documentId
            }
        ]);
    }
    
    $http( {
        method: 'GET',
        url: encodeURI(baseURL + '/' + $scope.database + '/' + $scope.bucket + '/' + $scope.documentId + '?exact=true&limit=1')
    }).
    success(function(data, status, headers, config) {
        $scope.document = data;
        $scope.fields   = [];
        for (var name in $scope.document) {
            if ($scope.document.hasOwnProperty(name)) {
                $scope.fields.push({key:name, value:$scope.document[name]});
            }
        }
    }).
    error(function(data, status, headers, config) {
        $scope.document = data;
    });
    
    
    $scope.create = function () {
        try {
            var obj = JSON.parse($scope.documentJSON);
            $http( {
                    method: 'PUT',
                    url: encodeURI(baseURL + '/' + $scope.database + '/' + $scope.bucket + '/' + $scope.documentKEY),
                    data : obj
            }).
            success(function(data, status, headers, config) {
                $scope.documentId = $scope.documentKEY;
                $scope.document = JSON.parse($scope.documentJSON);
                $scope.fields   = [];
                for (var name in $scope.document) {
                    if ($scope.document.hasOwnProperty(name)) {
                        $scope.fields.push({key:name, value:$scope.document[name]});
                    }
                }
                updateBreadcrumbs();
            }).
            error(function(data, status, headers, config) {
            });
        }catch (e) {
            alert('invalid JSON object');
        }
    };

    updateBreadcrumbs();
});
