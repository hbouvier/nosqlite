angular.module('nosqliteControllers', ['nosqliteServices', 'nosqliteModels'])
    .controller('DatabaseCtrl', function($scope, $http, $location, breadcrumbsService, DatabaseModel) {
        $scope.database = {
            addRowOnEnter : true,
            name  : '',
            allSelected : false,
            rows  : {},
            deleteDatabaseName : '',
            model : DatabaseModel
        };

        console.log('database controler')
        $scope.selectAll = function () {
            console.log('selectAll:',$scope.database.allSelected)
            for (var index in $scope.database.rows) {
                $scope.database.rows[index].selected = $scope.database.allSelected;
            }
        };

        $scope.alertOnDeleteDatabase = function (name) {
            $scope.preventAll();
            $scope.database.deleteDatabaseName = name;
            $('#deleteDatabaseModal').modal({
                backdrop:true,
                keyboard:true,
                show:true,
                remote:false
            });
        };
        $scope.deleteDatabase = function () {
            console.log('deleteing database ', $scope.database.deleteDatabaseName);
            deleteDatabase($scope.database.deleteDatabaseName);
            $('#deleteDatabaseModal').modal('hide');
        };

        $scope.create = function (name, tab) {
            if ($scope.database.rows[name])
                return;
            $http( {
                    method: 'POST',
                    url: encodeURI($scope.baseAPIurl + '/' + name)
            }).
            success(function(data, status, headers, config) {
                $scope.database.rows[name] = {name:name, selected:$scope.database.allSelected};
                fetchBuckets(name);
                if (tab) {
                    setTimeout(function () {
                        $scope.$apply(function () {
                            $scope.database.model.newRowAddedFocus = $scope.database.model.newRowAdded = true;
                        });
                    });
                } else {
                    $scope.database.model.newRowAddedFocus = $scope.database.model.newRowAdded = false;
                    $location.path($scope.urlBasePath + '/' + name);
                }
                $scope.database.name = '';

            }).
            error(function(data, status, headers, config) {
                    $scope.database.model.newRowAddedFocus = $scope.database.model.newRowAdded = false;
                $scope.database.name = '';
            });
        };

        $http( {
                method: 'GET',
                url: encodeURI($scope.baseAPIurl)
        }).
        success(function(data, status, headers, config) {
            data.databases.forEach(function(database){
                $scope.database.rows[database] = {
                    name:database,
                    selected:$scope.database.allSelected
                };
                fetchBuckets(database);
            });
        }).
        error(function(data, status, headers, config) {
            $scope.database.rows = [];
        });


        $scope.addRow = function () {
            $scope.database.model.newRowAdded = true;
            // When newRowAdded is changed to true, the ng-show will trigger and
            // make the ui object visible. However, the focus will not be set because
            // the ng-setfocus is evaled before the object is renderd on screen. By
            // waiting 100ms, before changing the condition to set the focus, Angular
            // will focus on the object after it has been redenred!
            setTimeout(function () {
                $scope.$apply(function () {
                    $scope.database.model.newRowAddedFocus = true;
                }, 100);
            });
        };

        $scope.$watch('database.model.newRowAddedFocus', function(value) {
            if(value === false) {
                $scope.database.model.newRowAdded = false;
            }
        });


        function fetchBuckets(database) {
            $http( {
                    method: 'GET',
                    url: encodeURI($scope.baseAPIurl + '/' + database)
            }).
            success(function(data, status, headers, config) {
                $scope.database.rows[database].buckets = data.buckets;
            }).
            error(function(data, status, headers, config) {
                $scope.database.rows[database].buckets = [];
            });

        }
        function deleteDatabase(database) {
            $http( {
                method: 'DELETE',
                url: encodeURI($scope.baseAPIurl + '/' + database)
            }).
                success(function(data, status, headers, config) {
                    delete $scope.database.rows[database];
                }).
                error(function(data, status, headers, config) {
                });

        }
        function updateBreadcrumbs() {
            breadcrumbsService.set('breadcrumbsID', [
                {
                    href: '#' + $scope.urlBasePath,
                    label: $scope.urlBaseLabel
                }
            ]);
        }
        updateBreadcrumbs();
    })
;
