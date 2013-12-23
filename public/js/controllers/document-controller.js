angular.module('nosqliteDocumentControllers', ['nosqliteModels', 'nosqliteServices'])
    .controller('DocumentCtrl', function($scope, $routeParams, $http, $location, breadcrumbsService, DocumentModel) {
        $scope.document = {
            databaseSelected : $routeParams.database,
            bucketSelected   : $routeParams.bucket,
            documentSelected : $routeParams.documentId,
            addRowOnEnter : true,
            rows             : [], // List of documents in this bucket
            content          : {}, // The document we are viewing/editing
            fields           : [], // The fields (keys) of the document we are viewing/editing
            model            : DocumentModel
        };

        $scope.select = function (index) {
            $location.path($scope.urlBasePath + '/' + $scope.document.databaseSelected + '/' + $scope.document.bucketSelected + '/' + JSON.stringify($scope.document.rows[index].key));
        };
        $scope.cancel = function () {
            $location.path($scope.urlBasePath + '/' + $scope.document.databaseSelected + '/' + $scope.document.bucketSelected);
        }

        $scope.find = function (key) {
            var url = encodeURI($scope.baseAPIurl + '/' + $scope.document.databaseSelected + '/' + $scope.document.bucketSelected + '/' +
                (key ? key + '?exact=true' : '*?exact=false'));
            $http( {
                method: 'GET',
                url: url
            }).
                success(function(data, status, headers, config) {
                    if (data instanceof Array)
                        $scope.document.rows = data;
                    else {
                        $scope.document.rows = [data];
                        $scope.document.documentSelected = data.key;
                        $scope.document.content = data;
                        $scope.document.fields = introspectDocument($scope.document.content);
                    }
                }).
                error(function(data, status, headers, config) {
                });
        };
        $scope.find($scope.document.documentSelected);

        function updateBreadcrumbs() {
            var vector = [
                {
                    href: '#' + $scope.urlBasePath,
                    label: $scope.urlBaseLabel
                },
                {
                    href: '#' + $scope.urlBasePath + '/' + $scope.document.databaseSelected,
                    label: $scope.document.databaseSelected
                },
                {
                    href: '#' + $scope.urlBasePath + '/' + $scope.document.databaseSelected + '/' + $scope.document.bucketSelected,
                    label: $scope.document.bucketSelected
                }
            ];
            if ($scope.document.documentSelected) {
                vector.push({
                    href: '#' + $scope.urlBasePath + '/' + $scope.document.databaseSelected + '/' + $scope.document.bucketSelected + '/' + $scope.document.documentSelected,
                    label: $scope.document.documentSelected
                });
            }
            breadcrumbsService.set('breadcrumbsID', vector);
        }

        updateBreadcrumbs();


        $scope.addRow = function () {
            $scope.document.content = {"key" : {"id" : ""}, "value":""};
            $scope.document.fields = introspectDocument($scope.document.content);
            $('#editDocumentModal').modal({
                backdrop:true,
                keyboard:true,
                show:true,
                remote:false
            });
        };

        /**
         * Show the Modal Dialog Box, when the user ask to delete a bucket
         * @param name
         */
        $scope.alertOnDeleteDocument = function (document) {
            $scope.preventAll();
            $scope.document.content = document;
            $('#deleteDocumentModal').modal({
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
        $scope.deleteDocument = function () {
            deleteDocument($scope.document.content);
            $('#deleteDocumentModal').modal('hide');
        };


        /**
         * REST call to delete a bucket
         * @param bucket
         */
        function deleteDocument(document) {
            $http( {
                method: 'DELETE',
                url: encodeURI($scope.baseAPIurl + '/' + $scope.document.databaseSelected + '/' + $scope.document.bucketSelected + '/' + JSON.stringify(document.key))
            }).
                success(function(data, status, headers, config) {
                    for (var index = 0 ; index < $scope.document.rows.length ; ++index) {
                        if ($scope.document.rows[index].key === document.key) {
                            $scope.document.rows.splice(index, 1);
                            break;
                        }
                    }
                }).
                error(function(data, status, headers, config) {
                });
        }

        $scope.editDocument = function (document) {
            $scope.preventAll();
            $scope.document.content = document;
            $scope.document.fields = introspectDocument($scope.document.content);
            $('#editDocumentModal').modal({
                backdrop:true,
                keyboard:true,
                show:true,
                remote:false
            });
        };

        function isValidJSON(value) {
            var valide = true;
            try {
                var obj = JSON.parse(value);
                valide = (typeof(obj) === 'object' && (obj instanceof Array) === false);

            } catch (e) {
                valide = false;
            }
            return valide;
        }

        function introspectDocument(document) {
            var fields   = {key:[], objectDescription:[], value:null, json:false, isValidJson:false};
            var readonly = (document.key && document.key.rev);

            // Copy the Key and REVision
            if (typeof(document.key) === 'object') {
                for (var name in document.key) {
                    if (document.key.hasOwnProperty(name)) {
                        fields.key.push({readonly:readonly, key:name, value:document.key[name]});
                    }
                }
            } else {
                fields.key.push({readonly:false, key:"Id", value:document.key});
            }

            // Document Value
            if (typeof(document.value) === 'string') {
                fields.isValidJson = isValidJSON(document.value);
                fields.json = false;
                fields.value = document.value;
            } else if (document.value instanceof Array) {
                fields.isValidJson = isValidJSON(document.value);
                fields.json = false;
                fields.value = JSON.stringify(document.value);
            } else if (typeof(document.value) === 'object') {
                fields.json = fields.isValidJson = true;
                fields.value = JSON.stringify(document.value);
                for (name in document.value) {
                    if (document.value.hasOwnProperty(name)) {
                        fields.objectDescription.push({key:name, value:document.value[name]});
                    }
                }
            } else  {
                fields.isValidJson = isValidJSON(document.value);
                fields.json = false;
                fields.value = document.value;
            }
            return fields;
        }

        /**
         * Watch for a key Modification
         */
        $scope.$watch('document.fields.key', function (value, oldvalue) {
            if (value && value.length === 1) {
                // Create a NEW document only with an ID (without a REVision)
                $scope.document.content.key = value[0].value;
            } else {
                // An existing document with ID and REVision
                // NOTE:  This should not happen, when the document exists the ID/REV will be readonly!
                $scope.document.content.key = {};
                for (var i = 0 ; value && i < value.length ; ++i) {
                    $scope.document.content.key[value[i].key] = value[i].value;
                }
            }
            console.log('Watch|key|key=', $scope.document.content.key, '|watch-value=', value);
        }, true);

        /**
         * Watch for individual property change, inside the JSON document
         */
        $scope.$watch('document.fields.objectDescription', function (value, oldvalue) {
            for (var i = 0 ; value && i < value.length ; ++i) {
                $scope.document.content.value[value[i].key] = value[i].value;
            }
            $scope.document.fields.value = JSON.stringify($scope.document.content.value);
            console.log('Watch|objectDescription|value=', $scope.document.content.value, '|stringvalue=', $scope.document.fields.value, '|watch-value=', value);
        }, true);

        /**
         * Watch for the raw content Modifications
         */
        $scope.$watch('document.fields.value', function (value, oldvalue) {
            try {
                $scope.document.content.value = JSON.parse(value);
            } catch (e) {
                $scope.document.content.value = value;
            }
            $scope.document.fields = introspectDocument($scope.document.content);
            console.log('Watch|value|value=', $scope.document.content.value, '|fields=', $scope.document.fields, '|watch-value=', value);
        });

        /**
         * When the user confirm the bucket deletion, we invoke the delete REST API
         * and hide the Dialog Box.
         */
        $scope.saveDocument = function () {
            $scope.save($scope.document.content);
        };


        /**
         * REST call to save a document
         */
        $scope.save = function () {
            var key = typeof($scope.document.content.key) === 'object' ? JSON.stringify($scope.document.content.key) : $scope.document.content.key;
            $http( {
                method: 'PUT',
                url:  encodeURI($scope.baseAPIurl + '/' + $scope.document.databaseSelected + '/' + $scope.document.bucketSelected + '/' + key),
                headers: {
                    'Content-Type': ($scope.document.fields.json ? 'application/json' : 'text/plain') + '; charset="UTF-8"'
                },
                data : $scope.document.content.value
            }).
                success(function(data, status, headers, config) {
                    var found = false;
                    for (var i = 0 ; i < $scope.document.rows.length ; ++i) {
                        if ($scope.document.rows[i].key.id === data.key.id) {
                            $scope.document.rows[i] = data;
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        $scope.document.rows.push(data);
                    }
                    $scope.document.content = data;
                    $scope.document.fields  = introspectDocument($scope.document.content);
                    if ($scope.document.documentSelected) {
                        $location.path($scope.urlBasePath + '/' + $scope.document.databaseSelected + '/' + $scope.document.bucketSelected + '/' + JSON.stringify(data.key));
                    } else {
                        $('#editDocumentModal').modal('hide');
                    }
                }).
                error(function(data, status, headers, config) {
                    alert('ERROR');
                });
        };
    })
;
