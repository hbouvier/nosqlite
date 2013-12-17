angular.module('nosqliteApplication', ['nosqliteServices','nosqliteControllers', 'nosqliteBucketsControllers','nosqliteDocumentsControllers', 'nosqliteDocumentControllers'])
.config(['$httpProvider', function($httpProvider) {
    delete $httpProvider.defaults.headers.common["X-Requested-With"];
}])
.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
    $routeProvider.
        when('/databases', {controller:'DatabasesCtrl', templateUrl:'views/databases.html'}).
        when('/databases/:database', {controller:'BucketsCtrl', templateUrl:'views/buckets.html'}).
        when('/databases/:database/:bucket', {controller:'DocumentsCtrl', templateUrl:'views/documents.html'}).
        when('/databases/:database/:bucket/:documentId', {controller:'DocumentCtrl', templateUrl:'views/document.html'}).
        otherwise({redirectTo:'/databases'});
}])
.run(function (breadcrumbsService) {
    breadcrumbsService.set('breadcrumbsID', [{
            href: '#/databases/',
            label: 'Databases'
        }
    ]);
})
.directive('autoFillSync', function($timeout) {
    return {
        require: '?ngModel',
        link: function(scope, elem, attrs, ngModel) {
            var origVal = elem.val();
            var callback = function () {
                var newVal = elem.val();
                if(origVal !== newVal) {
                    ngModel.$setViewValue(newVal);
                }
                if (ngModel.$invalid) {
                    $timeout(callback, 500);
                }
            };
            $timeout(callback, 500);
        }
    };
})
.directive('ngIf', function() {
    return {
        link: function(scope, element, attrs) {
            if(scope.$eval(attrs.ngIf)) {
                // remove '<div ng-if...></div>'
                //element.replaceWith(element.children())
            } else {
              element.replaceWith(' ')
            }
        }
    }
})
.directive('ngBreadcrumbs', function($log, breadcrumbsService) {
    return {
        restrict: 'A',
        template: '<ol class="nav navbar-nav">' + 
                       '<div class="breadcrumb breadcrumb-nav">' +
                            '<li ng-repeat="bc in breadcrumbs">' +
                                '<a ng-click="unregisterBreadCrumb( $index )" href="{{bc.href}}">{{bc.label}}</a>' +
                            '</li>' +
                            '<li class="active">' +
                                '{{activeBreadCrum.label}}' +
                            '</li>' +
                        '</div>' +
                    '</ol>',
        replace: true,
        compile: function(tElement, tAttrs) {
            return function($scope, $elem, $attr) {
                var bc_id = $attr['id'],
                    resetCrumbs = function() {
                        $scope.breadcrumbs = [];
                        $scope.activeBreadCrum = '';
                        var vector = [];
                        angular.forEach(breadcrumbsService.get(bc_id), function(v) {
                            vector.push(v);
                        });
                        $scope.breadcrumbs = vector.splice(0, vector.length -1);
                        $scope.activeBreadCrum = vector[vector.length -1];
                    };
                resetCrumbs();
                $scope.unregisterBreadCrumb = function( index ) {
                    breadcrumbsService.setLastIndex( bc_id, index );
                    resetCrumbs();
                };
                $scope.$on( 'breadcrumbsRefresh', function() {
                    //$log.log( "$on" );
                    resetCrumbs();
                });
            };
        }
    };
})
;

