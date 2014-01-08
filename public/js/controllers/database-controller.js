angular.module('nosqliteControllers', ['nosqliteServices', 'nosqliteModels'])
    .controller('DatabaseCtrl', function($scope, $location, breadcrumbsService, Database, DatabaseModel) {
        $scope.database = {
            addRowOnEnter : true,
            name  : '',
            allSelected : false,
            rows  : {},
            deleteDatabaseName : '',
            model : DatabaseModel
        };

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
            console.log('DATABASE:POST:', name);
            if ($scope.database.rows[name])
                return;
            Database.post({database:name}, {}).$promise.then(function (data) {
                //$scope.database.rows[name] = {name:name, selected:$scope.database.allSelected};
                //fetchBuckets(name);
                $scope.database.rows[name] = data.databases[name];
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
            }).catch(function (reason) {
                alert('Unable to create the database ' + name + ' because ' + JSON.stringify(reason));
                $scope.database.model.newRowAddedFocus = $scope.database.model.newRowAdded = false;
                $scope.database.name = '';
            });
        };

        console.log('DATABASE:query:');
        /** list()
         *    databases = { 'dbName'   : { name:'dbName',  selected:false },
                            'otherDb'  : { name:'otherDb', selected:false },
                             $promise  : promise,
                             $resolved : true }
         */
        Database.list().$promise.then(function (databases) {
            $scope.database.rows = databases.databases;
        }).catch(function (reason) {
            alert('An error occurred while fetching the database list: ' +  JSON.stringify(reason));
            $scope.database.rows = {};
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
                setTimeout(function () {
                    $scope.database.model.newRowAdded = false;
                }, 100);
            }
        });


        function fetchBuckets(database) {
            console.log('BUCKET:GET:', database);
            Database.get({database:database}).$promise.then(function (response) {
                console.log('bucket:', database, ', length:', response.buckets.length)
                $scope.database.rows[database].buckets = response.buckets;
            }).catch(function (reason) {
                alert('An error occurred while fetching the buckets for database ' + database + ' because: ' +  JSON.stringify(reason));
                $scope.database.rows[database].buckets = [];
            });
        }
        function deleteDatabase(database) {
            console.log('DATABASE:DELETE:', database);
            Database.delete({database:database}).$promise.then(function () {
                delete $scope.database.rows[database];
            }).catch(function (reason) {
                alert('An error occurred while deleting the database ' + database + ' because: ' +  JSON.stringify(reason));
                $scope.database.rows[database].buckets = [];
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
