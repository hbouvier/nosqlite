angular.module('nosqliteDocumentControllers', ['nosqliteServices'])
.controller('DocumentCtrl', function($scope, $routeParams, $http, $location, breadcrumbsService) {
    var baseURL = '/nosqlite/api/v1';
    $scope.database   = $routeParams.database;
    $scope.bucket     = $routeParams.bucket;
    $scope.documentId = $routeParams.documentId;
    $scope.document   = {};
    $scope.fields     = [];
    
    $scope.documentKEY  ='';
    $scope.documentJSON = '';
    $scope.documentRev  = '';
    $scope.documentType = 'JSON';

    $scope.save = function () {
        $scope.document = {key:{},value:{}};
        for (var i = 0 ; i < $scope.fields.length ; ++i) {
            console.log('$scope.document['+$scope.fields[i].group+']['+$scope.fields[i].key+'] = '+$scope.fields[i].value);
            $scope.document[$scope.fields[i].group][$scope.fields[i].key] = $scope.fields[i].value;
        }
        $scope.documentId = $scope.document.key;
        console.log('ID:', $scope.documentId , ', ', $scope.document.key);
        console.log('doc:', $scope.document);
        $http( {
            method: 'PUT',
            url: encodeURI(baseURL + '/' + $scope.database + '/' + $scope.bucket + '/' + JSON.stringify($scope.documentId)),
            headers: {
                'Content-type': 'application/json'
            },
            data : $scope.document.value
        }).
        success(function(data, status, headers, config) {
            console.log('url:', encodeURI('/#/databases/' + $scope.database + '/' + $scope.bucket + '/' + JSON.stringify(data.key)));
            $location.path('/databases/' + $scope.database + '/' + $scope.bucket + '/' + JSON.stringify(data.key));
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
        for (var name in $scope.document.key) {
            if ($scope.document.key.hasOwnProperty(name)) {
                $scope.fields.push({group:'key', key:name, value:$scope.document.key[name]});
            }
        }
        if (typeof($scope.document.value) === 'string' || $scope.document.value instanceof Array) {
            $scope.fields.push({group:'value', key:null, value:$scope.document.value});
        } else {
            for (name in $scope.document.value) {
                if ($scope.document.value.hasOwnProperty(name)) {
                    $scope.fields.push({group:'value', key:name, value:$scope.document.value[name]});
                }
            }
        }
    }).
    error(function(data, status, headers, config) {
        $scope.document = data;
    });
    
    $scope.cancel = function () {
        $location.path('/databases/' + $scope.database + '/' + $scope.bucket);
    };
    
    $scope.create = function () {
        try {
            var obj = $scope.documentType === 'JSON' ? JSON.parse($scope.documentJSON) : $scope.documentJSON;
            console.log('doc=', obj);
            $http( {
                    method: 'PUT',
                    url: encodeURI(baseURL + '/' + $scope.database + '/' + $scope.bucket + '/' + $scope.documentKEY),
                    data : obj,
                    headers: {'Content-Type': ($scope.documentType === 'JSON' ? 'application/json' : 'text/plain') + '; charset="UTF-8"'}
            }).
            success(function(data, status, headers, config) {
                $scope.documentId = data.key;
                $scope.document = data;
                $location.path('/databases/' + $scope.database + '/' + $scope.bucket + '/' + JSON.stringify(data.key));
                /*
                $scope.documentId = data.key;
                $scope.document = data;
                $scope.fields   = [];
                for (var name in $scope.document.key) {
                    if ($scope.document.key.hasOwnProperty(name)) {
                        $scope.fields.push({group:'key', key:name, value:$scope.document.key[name]});
                    }
                }
                for (name in $scope.document.value) {
                    if ($scope.document.value.hasOwnProperty(name)) {
                        $scope.fields.push({group:'value', key:name, value:$scope.document.value[name]});
                    }
                }
                updateBreadcrumbs();
                */
            }).
            error(function(data, status, headers, config) {
            });
        }catch (e) {
            alert('invalid JSON object');
        }
    };

    updateBreadcrumbs();
});
