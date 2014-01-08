angular.module('nosqliteDocumentControllers', ['nosqliteModels', 'nosqliteServices'])
    .controller('DocumentCtrl', function($scope, $routeParams, Document, $location, breadcrumbsService, DocumentModel) {
        $scope.document = {
            databaseSelected : $routeParams.database,
            bucketSelected   : $routeParams.bucket,
            documentSelected : $routeParams.documentId,
            addRowOnEnter    : true,
            rows             : [], // List of documents in this bucket
            content          : null, // The document we are viewing/editing
            json             : false,
            model            : DocumentModel,
            contentTypes     : [
                {name:"json",       contentType:'application/json; charset="UTF-8"'},
                {name:"javascript", contentType:'application/javascript; charset="UTF-8"'},
                {name:"css",        contentType:'text/css; charset="UTF-8"'},
                {name:"html",       contentType:'text/html; charset="UTF-8"'},
                {name:"text",       contentType:'text/plain; charset="UTF-8"'}
            ]
        };


        ///////////////////////////////////////////////////////////////////////

        find($scope.document.documentSelected);
        updateBreadcrumbs();


        ///////////////////////////////////////////////////////////////////////
        function setPageContent(document) {
            $scope.document.content = document;
            if (typeof(document.value) === 'object' && document.value instanceof Array === false) {
                $scope.document.json = true;
                $scope.document.content.value = JSONprettify(JSON.stringify(document.value));
            } else {
                $scope.document.json = false;
                $scope.document.content.value = document.value;
            }
        }

        function closeAll() {
            for (var i = 0 ; i < $scope.document.rows.length ; ++i) {
                $scope.document.rows[i].edit = false;
            }
        }

        $scope.contentTypeToName = function (contentType) {
            for (var i = 0 ; i < $scope.document.contentTypes.length ; ++i) {
                if ($scope.document.contentTypes[i].contentType === contentType)
                    return $scope.document.contentTypes[i].name;
            }
            return $scope.contentTypeToName('text/plain; charset="UTF-8"');
        };

        /**
         * When clicking anywhere on a Document "Row"
         *
         * @param index
         */
        $scope.select = function (index) {
            if ($scope.document.rows[index].edit) return;
            closeAll();
            $scope.document.rows[index].edit = true;
            $scope.document.model.content = null;
            setPageContent($scope.document.rows[index]);
        };
        $scope.close = function (index) {
            $scope.preventPropagation();
            $scope.document.rows[index].edit = false;
        }



        $scope.chooseContentType = function (document, contentType) {
            document.contentType = contentType;
        };

        /**
         * Clicking on the EDIT Icon of a document row
         *
         * @param document
         */
        $scope.editDocument = function (document) {
            $location.path(
                $scope.urlBasePath + '/' +
                    $scope.document.databaseSelected + '/' +
                    $scope.document.bucketSelected + '/' +
                    JSON.stringify(document.key)
            );
        };

        /**
         * When Clicking on a row TRASHCAN, show the dialog box
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
         * The ADD Button
         */
        $scope.addRow = function () {
            $scope.document.model.content={key:'',value:''};
            closeAll();
            setTimeout(function() {
                $('#key').focus();
            }, 100);
            /*
             $scope.document.content = {"key" : {"id" : ""}, "value":""};
             $('#editDocumentModal').modal({
             backdrop:true,
             keyboard:true,
             show:true,
             remote:false
             });
             */
        };
        $scope.resetRow = function () {
            $scope.document.model.content = null;
            $scope.document.addRowOnEnter = true;
        }

        ///////////////////////////////////////////////////////////////////////

        /**
         *  Click on the SAVE button
         */
        $scope.saveDocument = function (document) {
            $scope.document.content = document;
            save();
        };

        /**
         * The CANCEL button on the dialog box
         *
         */
        $scope.cancel = function () {
            $location.path($scope.urlBasePath + '/' + $scope.document.databaseSelected + '/' + $scope.document.bucketSelected);
        }

        /**
         * The "DELETE IT" button on the dialog box
         *
         */
        $scope.deleteDocument = function () {
            deleteDocument($scope.document.content);
            $('#deleteDocumentModal').modal('hide');
        };

        ///////////////////////////////////////////////////////////////////////

        $scope.next = function () {
            $scope.document.model.offset += $scope.document.model.limit;
            find();
            $scope.preventAll();
        };
        $scope.previous = function () {
            $scope.document.model.offset -= $scope.document.model.limit;
            $scope.document.model.offset = $scope.document.model.offset < 0 ? 0 : $scope.document.model.offset;
            find();
            $scope.preventAll();
        };

        function find(key) {
            var params = {
                database : $scope.document.databaseSelected,
                bucket   : $scope.document.bucketSelected,
                document : (key ? key  : '*'),
                exact    : (key ? true : false)
            };
            if (key) {
                Document().get(params).$promise.then(function (data) {
                    $scope.document.rows = [data];
                    $scope.document.documentSelected = data.key;
                    setPageContent(data);
                }).catch(function (reason) {
                    $scope.document.rows = [];
                    $scope.document.documentSelected = undefined;
                    alert('Unable to get document from database because ' + JSON.stringify(reason));
                });

            } else {
                params.offset = $scope.document.model.offset;
                params.limit  = $scope.document.model.limit;
                Document().list(params).$promise.then(function (data) {
                    $scope.document.rows = data;
                }).catch(function (reason) {
                    $scope.document.rows = [];
                    $scope.document.documentSelected = undefined;
                    alert('Unable to get document from database because ' + JSON.stringify(reason));
                });
            }

            /*
            var url = encodeURI($scope.baseAPIurl + '/' + $scope.document.databaseSelected + '/' + $scope.document.bucketSelected + '/' +
                (key ? key + '?exact=true' : ('*?exact=false&offset=' + $scope.document.model.offset + '&limit=' +  $scope.document.model.limit)));

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
                        setPageContent(data);
                    }
                }).
                error(function(data, status, headers, config) {
                    $scope.document.rows = [];
                    $scope.document.documentSelected = undefined;
                });
             */
        };

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

        /**
         * REST call to delete a bucket
         * @param bucket
         */
        function deleteDocument(document) {
            Document().delete({
                database : $scope.document.databaseSelected,
                bucket   : $scope.document.bucketSelected,
                document : JSON.stringify(document.key)
            }).$promise.then(function (data) {
                for (var index = 0 ; index < $scope.document.rows.length ; ++index) {
                    if ($scope.document.rows[index].key === document.key) {
                        $scope.document.rows.splice(index, 1);
                        break;
                    }
                }
            }).catch(function (reason) {
                alert('Unable to delete documents from database ' + $scope.bucket.databaseSelected + '/' + $scope.document.bucketSelected + ' because ' + JSON.stringify(reason));
            });
            /*
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
                */
        }

        /**
         * Helper function to detect JSON vs Native type (e.g. Array, Number, Boolean and String)
         *
         * @param value
         * @returns {boolean}
         */
        $scope.isValidJSON = function (value) {
            var valide = true;
            try {
                var obj = JSON.parse(value);
                valide = (typeof(obj) === 'object' && (obj instanceof Array) === false);

            } catch (e) {
                valide = false;
            }
            return valide;
        }

        /**
         * REST call to save a document
         */
        function save() {
            var params = {
                database : $scope.document.databaseSelected,
                bucket   : $scope.document.bucketSelected,
                document : typeof($scope.document.content.key) === 'object' ? JSON.stringify($scope.document.content.key) : $scope.document.content.key
            };
            console.log('save:content-type=', $scope.document.content.contentType);
            Document($scope.document.content.contentType).put(params, $scope.document.content.value).$promise.then(function (data) {
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
                if ($scope.document.documentSelected) {
                    $location.path(
                        $scope.urlBasePath
                            + '/' + $scope.document.databaseSelected
                            + '/' + $scope.document.bucketSelected
                        // + '/' + JSON.stringify(data.key)
                    );
                } else {
                    $('#editDocumentModal').modal('hide');
                }
            }).catch(function (reason) {
                alert('Unable to save document into database ' + $scope.bucket.databaseSelected + '/' + $scope.document.bucketSelected + ' because ' + JSON.stringify(reason));
            });


            /*
            var key = typeof($scope.document.content.key) === 'object' ? JSON.stringify($scope.document.content.key) : $scope.document.content.key;
            $scope.document.json = $scope.document.json === true ? true : $scope.document.json === false ? false : $scope.isValidJSON($scope.document.content.value);
            $http( {
                method: 'PUT',
                url:  encodeURI($scope.baseAPIurl + '/' + $scope.document.databaseSelected + '/' + $scope.document.bucketSelected + '/' + key),
                headers: {
                    'Content-Type':   ($scope.document.json ? 'application/json' : 'text/plain') + '; charset="UTF-8"',
                    'X-Content-Type' : $scope.document.content.contentType
                },
                transformRequest : function (data, headers) {
                    console.log('docuent:transformRequest:data=', data);
                    return data;
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
                    if ($scope.document.documentSelected) {
                        $location.path(
                              $scope.urlBasePath
                            + '/' + $scope.document.databaseSelected
                            + '/' + $scope.document.bucketSelected
                            // + '/' + JSON.stringify(data.key)
                        );
                    } else {
                        $('#editDocumentModal').modal('hide');
                    }
                }).
                error(function(data, status, headers, config) {
                    alert('ERROR');
                });
                */
        };
        function JSONprettify(json) {
            if (typeof json != 'string') {
                json = JSON.stringify(json, undefined, 2);
            }

            json = json.replace(/{/g, "{\n").replace(/\[/g, "[\n").replace(/,/g, ",\n");
            json = json.replace(/}/g, "\n}").replace(/\]/g, "\n]");

            var prefix = '        ';
            var prefixLen = prefix.length;
            var ident = '';
            return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:.*)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[\{\}\[\]]?)/g, function (match) {
                var key = false;
                var thisIdent = ident;

                if (/^"[^"]*"\s*:.*/.test(match)) {
                    key = true;
                }
                if (/\{|\[/.test(match)) {
                    ident += prefix;
                }
                if (/\}|\]/.test(match)) {
                    thisIdent = ident = ident.substring(prefixLen);
                }
                if (match === '') {
                    thisIdent = '';
                }
                return thisIdent + match;
            });
        }
    })
;
