var ___g_NoSQLiteRoutePrefix___ = '/home';
angular.module('nosqliteApplication', ['nosqliteServices','nosqliteControllers', 'nosqliteBucketControllers', 'nosqliteDocumentControllers'])
.run(function($rootScope) {
    $rootScope.baseAPIurl  = '/api/v1';
    $rootScope.baseUIurl   = '/';
    $rootScope.urlBasePath = ___g_NoSQLiteRoutePrefix___;
    $rootScope.urlBaseLabel = 'Home';
})
.config(['$httpProvider', function($httpProvider) {
    delete $httpProvider.defaults.headers.common["X-Requested-With"];
}])
.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
    $routeProvider.
        when(___g_NoSQLiteRoutePrefix___, {controller:'DatabaseCtrl', templateUrl:'views/database.html'}).
        when(___g_NoSQLiteRoutePrefix___ + '/:database', {controller:'BucketCtrl', templateUrl:'views/bucket.html'}).
        when(___g_NoSQLiteRoutePrefix___ + '/:database/:bucket', {controller:'DocumentCtrl', templateUrl:'views/document.html'}).
        when(___g_NoSQLiteRoutePrefix___ + '/:database/:bucket/:documentId', {controller:'DocumentCtrl', templateUrl:'views/editDocument.html'}).
        otherwise({redirectTo:___g_NoSQLiteRoutePrefix___});
}])
.run(function ($rootScope, breadcrumbsService) {
    breadcrumbsService.set('breadcrumbsID', [{
            href: '#' + $rootScope.urlBasePath,
            label: $rootScope.urlBaseLabel
        }
    ]);
})
.run(function($rootScope) {
    $rootScope.clear = function (key) {
        var from_css_right_inner_addon_input_padding_right_in_px = 20; //px
            if (event.offsetX > event.target.clientWidth - from_css_right_inner_addon_input_padding_right_in_px) {
            $rootScope[key] = '';
        }
    };
    $rootScope.preventPropagation = function () {
        event.stopPropagation();
    };
    $rootScope.preventDefault = function () {
        event.preventDefault();
    };
    $rootScope.preventAll = function () {
        event.preventDefault();
        event.stopPropagation();
    };
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
.directive('ngPrettify', function($parse) {
    return {
        link: function(scope, element, attrs) {
            function JSONprettify(json) {
                if (typeof json != 'string') {
                    json = JSON.stringify(json, undefined, 2);
                }
                json = json.replace(/{/g, "{    ").
                    replace(/,/g, ",    ");

                json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                    var cls = 'number';
                    if (/^"/.test(match)) {
                        if (/:$/.test(match)) {
                            cls = 'key';
                        } else {
                            cls = 'string';
                        }
                    } else if (/true|false/.test(match)) {
                        cls = 'boolean';
                    } else if (/null/.test(match)) {
                        cls = 'null';
                    }
                    return '<span class="' + cls + '">' + match + '</span>';
                });
            }
            var model = $parse(attrs.ngPrettify)(scope);
            var html = (typeof(model) === 'object') ? '<pre>'+JSONprettify(model)+'</pre>' : model;
            element.replaceWith(html);
        }
    };
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
.directive('ngEnter', function() {
    return function(scope, element, attrs) {
        element.bind("keydown keypress", function(event) {
            if(event.which === 13) {
                scope.$apply(function(){
                    scope.$eval(attrs.ngEnter);
                });
                event.preventDefault();
            }
        });
    };
})
.directive('ngTab', function() {
    return function(scope, element, attrs) {
        element.bind("keydown keypress", function(event) {
            if(event.which === 9) {
                scope.$apply(function(){
                    scope.$eval(attrs.ngTab);
                });
                event.preventDefault();
            }
        });
    };
})
.directive('ngEscape', function() {
    return function(scope, element, attrs) {
        element.bind("keydown keypress", function(event) {
            if(event.which === 27) {
                element.blur();
            }
        });
    };
})
.directive('ngSetfocus', function($timeout, $parse) {
    return {
        //scope: true,   // optionally create a child scope
        link: function(scope, element, attrs) {
            var model = $parse(attrs.ngSetfocus);
            scope.$watch(model, function(value) {
                if(value === true) {
                    element[0].focus();
                }
            });
            element.bind('blur', function() {
                element[0].value='';
                scope.$apply(model.assign(scope, false));
            });
        }
    };
})
;

