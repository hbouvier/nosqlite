angular.module('nosqliteBreadcrumbsControllers', [])
.controller('BreadcrumbsCtrl', function($scope, $http) {
    $scope.busy = true;
    $scope.searchText = '';
    $scope.breadcrumbs = ["Databases"];
})
;
