angular.module('nosqliteModels', [])
    .factory('DatabaseModel', function() {
        var model = {
            newRowAdded : false
        };
        return model;
    })
    .factory('BucketModel', function() {
        var model = {
            newRowAdded : false
        };
        return model;
    })
    .factory('DocumentModel', function() {
        var model = {
            newRowAdded : false,
            field : {key:{id:""}, value:""}
        };
        return model;
    })
;