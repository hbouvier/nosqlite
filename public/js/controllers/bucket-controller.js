angular.module('nosqliteBucketControllers', ['nosqliteServices', 'nosqliteModels'])
    .controller('BucketCtrl', function($scope, $routeParams, $http, $location, breadcrumbsService, BucketModel) {
        $scope.bucket = {
            name : '',
            addRowOnEnter : true,
            deleteBucketName : '',
            databaseSelected : $routeParams.database,
            rows : [],
            model : BucketModel
        };

        $scope.addRow = function () {
            $scope.bucket.model.newRowAdded = true;
            // When newRowAdded is changed to true, the ng-show will trigger and
            // make the ui object visible. However, the focus will not be set because
            // the ng-setfocus is evaled before the object is renderd on screen. By
            // waiting 100ms, before changing the condition to set the focus, Angular
            // will focus on the object after it has been redenred!
            setTimeout(function () {
                $scope.$apply(function () {
                    $scope.bucket.model.newRowAddedFocus = true;
                }, 100);
            });
        };
        $scope.$watch('bucket.model.newRowAddedFocus', function(value) {
            if(value === false) {
                $scope.bucket.model.newRowAdded = false;
            }
        });

        /**
         * Show the Modal Dialog Box, when the user ask to delete a bucket
         * @param name
         */
        $scope.alertOnDeleteBucket = function (name) {
            $scope.preventAll();
            $scope.bucket.deleteBucketName = name;
            $('#deleteBucketModal').modal({
                backdrop:true,
                keyboard:true,
                show:true,
                remote:false
            });
        };

        /**
         * When the user confirm the bucket deletion, we invoke the delete REST API
         * and hide the Dialog Box.
         */
        $scope.deleteBucket = function () {
            deleteBucket($scope.bucket.deleteBucketName);
            $('#deleteBucketModal').modal('hide');
        };


        /**
         * REST call to delete a bucket
         * @param bucket
         */
        function deleteBucket(bucket) {
            $http( {
                method: 'DELETE',
                url: encodeURI($scope.baseAPIurl + '/' + $scope.bucket.databaseSelected + '/' + bucket)
            }).
                success(function(data, status, headers, config) {
                    for (var index = 0 ; index < $scope.bucket.rows.length ; ++index) {
                        if ($scope.bucket.rows[index].name === bucket) {
                            $scope.bucket.rows.splice(index, 1);
                            break;
                        }
                    }
                }).
                error(function(data, status, headers, config) {
                });
        }

        /**
         * REST call to create a new bucket
         * @param bucketName
         */
        $scope.create = function (bucketName, tab) {
            $http( {
                    method: 'POST',
                    url: encodeURI($scope.baseAPIurl + '/' + $scope.bucket.databaseSelected + '/' + bucketName)
            }).
            success(function(data, status, headers, config) {
                $scope.bucket.rows.push({name:bucketName, count:0});

                if (tab) {
                    setTimeout(function () {
                        $scope.$apply(function () {
                            $scope.bucket.model.newRowAddedFocus = $scope.bucket.model.newRowAdded = true;
                        })
                    },100);
                } else {
                    $scope.bucket.model.newRowAddedFocus = $scope.bucket.model.newRowAdded = false;
                    $location.path($scope.urlBasePath + '/' + $scope.bucket.databaseSelected + '/' + bucketName);
                }
                $scope.bucket.model = '';
            }).
            error(function(data, status, headers, config) {
                $scope.bucket.model.newRowAddedFocus = $scope.bucket.model.newRowAdded = false;
                $scope.bucket.model = '';
            });
        };

        $http( {
            method: 'GET',
            url: encodeURI($scope.baseAPIurl + '/' + $scope.bucket.databaseSelected)
        }).
        success(function(data, status, headers, config) {
            $scope.bucket.rows = data.buckets;
        }).
        error(function(data, status, headers, config) {
            $scope.bucket.rows = [];
        });
        breadcrumbsService.set('breadcrumbsID', [
            {
                href: '#' + $scope.urlBasePath,
                label: $scope.urlBaseLabel
            },
            {
                href: '#' + $scope.urlBasePath + '/' + $scope.bucket.databaseSelected,
                label: $scope.bucket.databaseSelected
            }
        ]);
    });
