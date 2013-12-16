angular.module('nosqliteBreadcrumbsControllers', []) // breadcrumbsService
.controller('BreadcrumbsCtrl', function($scope, $http) {
    $scope.busy = true;
    $scope.searchText = '';
    /*
    breadcrumbsService.push("home", {
        href: '#/',
        label: 'Home'
    });
    */
})
;
