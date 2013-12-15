angular.module('nosqliteApplication', ['nosqliteServices', 'nosqliteBreadcrumbsControllers','nosqliteControllers', 'nosqliteBucketsControllers','nosqliteDocumentsControllers'])
.config(['$httpProvider', function($httpProvider) {
    delete $httpProvider.defaults.headers.common["X-Requested-With"];
}])
.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
    $routeProvider.
        when('/databases', {controller:'DatabasesCtrl', templateUrl:'views/databases.html'}).
        when('/databases/:database', {controller:'BucketsCtrl', templateUrl:'views/buckets.html'}).
        when('/databases/:database/:bucket', {controller:'DocumentsCtrl', templateUrl:'views/documents.html'}).
        otherwise({redirectTo:'/databases'});
}])
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

;

