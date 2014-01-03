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
            limit  : 5,
            offset : 0,
            field : {key:{id:""}, value:""}
        };
        return model;
    })
;