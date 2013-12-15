module.exports = function () {
    var Q = require('q');
    
    function proxy(promise, message, expectations, timeout) {
        var pending = true;
        timeout = timeout || 5000;
        
        promise.then(function (result) {
            pending = false;
            expectations('fulfilled', result);
        }, function (reason) {
            pending = false;
            expectations('rejected', reason);
        });

        waitsFor(function () {
            return promise.isPending() === false;
        }, message, timeout);

        runs(function () {
            if (pending) {
                expectations('pending');
            }
        });
        return proxy;
    }
    return proxy;

/*
    function assertAsyncExpects(promiseSpy, target, additionalExpectation) {
        waitsFor(function () { 
            return promiseSpy.called || target.errorInPromise;
        }, 50);
        
        runs(function () {
            // this tells me if there was any unhandled exception:
            expect(target.errorInPromise).not.toBeDefined();
            // this asks the spy if everything was as expected:          
            expect(promiseSpy.target[promiseSpy.methodName]).toHaveBeenCalled();
            // optional expectations:
            if (additionalExpectation)
                additionalExpectation();
        });
    }
    
    function spyReturningPromise(target, methodName) {
        var spyObj = {
            called: false, 
            target: target, 
            methodName: methodName
        };
        
        spyOn(target, methodName).andCallFake(function () {
            spyObj.called = true;
            return Q.defer().promise;
        });
        return spyObj;
    }
    
    return {
        assertAsyncExpects:assertAsyncExpects,
        spyReturningPromise:spyReturningPromise
    };
    */
}();