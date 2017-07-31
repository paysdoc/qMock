/**
 * mock for $q to eliminate the need for explicit digest cycles during unit testing
 */
(function () {
  'use strict';

  angular.module('holmes-app.test.mock')
    .service('mockQ', function () {
      var Deferred;

      function executeWithPromise(changeState, callback, args, deferred) {
        if (callback) {
          var result = callback(args);
          deferred[changeState](result);
        } else {
          deferred[changeState](args);
        }
        return deferred.promise;
      }

      Deferred = function (previousDeferred) {
        var self = this;
        this.previous = previousDeferred;
        this.$$resolve = [];
        this.$$reject = [];
        this.$$notify = [];

        function addHandler(changeState, callback, deferred) {
          if (callback) {
            self['$$' + changeState].push(function (data) {
              return executeWithPromise(changeState, callback, data, deferred);
            });
          }
        }

        function executeHandlers(handlers, data) {
          angular.forEach(handlers, function (handler) {
            handler(data);
          });
        }

        this.resolve = function (data) {
          self.data = data;
          self.resolved = true;
          executeHandlers(self.$$resolve, data);
        };
        this.reject = function (data) {
          self.data = data;
          self.rejected = true;
          executeHandlers(self.$$reject, data);
        };
        this.notify = function (data) {
          executeHandlers(self.$$notify, data);
        };
        this.promise = {
          then: function (resolve, reject, notify) {
            var deferred = new Deferred(self);
            addHandler('resolve', resolve, deferred);
            addHandler('reject', reject, deferred);
            addHandler('notify', notify, deferred);

            if (self.resolved) {
              executeWithPromise('resolve', resolve, self.data, deferred);
            }
            if (self.rejected) {
              executeWithPromise('reject', reject, self.data, deferred);
            }
            return deferred.promise;
          },
          catch: function (callback) {
            var deferred = self.previous || self;
            return deferred.promise.then(null, callback);
          },
          finally: function (callback, progressBack) {
            var deferred = self.previous || self;
            return deferred.promise.then(callback, callback, progressBack);
          }
        };
      };

      function q(resolve, reject, notify) {
        return new Deferred().promise.then(resolve, reject, notify);
      }

      q.defer = function () {
        return new Deferred();
      };

      q.all = function (promises) {
        var promiseArray = [].concat(promises);
        var deferred = new Deferred(),
          unresolvedPromises = promiseArray.length,
          results = promiseArray.length > 1 ? [] : {};

        angular.forEach(promises, function (promise, key) {
          promise.then(function (value) {
            results[key] = value;
            unresolvedPromises--;
            if (!(unresolvedPromises)) {
              deferred.resolve(results);
            }
          }, function (reason) {
            deferred.reject(reason);
          });
        });

        return deferred.promise;
      };

      q.reject = function (reason) {
        var result = new Deferred();
        result.reject(reason);
        return result.promise;
      };

      function when(value, callback, errback, progressBack) {
        var result = new Deferred();
        result.resolve(value);
        return result.promise.then(callback, errback, progressBack);
      }

      q.when = when;
      q.resolve = when; //"when" automatically resolves

      return q;
    });

})();

