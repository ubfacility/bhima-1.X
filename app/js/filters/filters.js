angular.module('kpk.filters', [])
  .filter('boolean', function() {
    return function (input) {
      return Boolean(Number(input));
    };
  });
