angular.module('kpk.controllers')
.controller('stock.entry.review', [
  '$scope',
  '$location',
  'validate',
  'appstate',
  'connect',
  'messenger',
  'util',
  'uuid',
  function ($scope, $location, validate, appstate, connect, messenger, util, uuid) {
    var session = $scope.session = {};

    appstate.register('project', function (project) {
      $scope.project = project;
      angular.extend(session, appstate.get('stock.data'));
      session.valid = !!appstate.get('stock.data');
    });

    function processStock () {
      var stocks = [];
      session.lots.data.forEach(function (stock) {
        stocks.push({
          inventory_uuid      : stock.inventory_uuid,
          //purchase_price      : stock.purchase_price,
          expiration_date     : util.convertToMysqlDate(stock.expiration_date),
          entry_date          : util.convertToMysqlDate(new Date()),
          lot_number          : stock.lot_number,
          purchase_order_uuid : stock.purchase_order_uuid,
          tracking_number     : stock.tracking_number,
          quantity            : stock.quantity
        });
      });

      return stocks;
    }

    function processMovements () {
      var movements = [];
      var doc_id = uuid();
      session.lots.data.forEach(function (stock) {
        movements.push({
          document_id     : doc_id,
          tracking_number : stock.tracking_number,
          direction       : 'Enter',
          date            : util.convertToMysqlDate(new Date()),
          quantity        : stock.quantity,
          depot_id        : session.cfg.depot.id,
          destination     : session.cfg.depot.id
        });
      });

      return movements;
    }

    function invalid () {
    }

    $scope.submit = function () {
      var stock = processStock();
      var movements = processMovements();
      connect.basicPut('stock', stock)
      .then(function () {
        return connect.basicPut('stock_movement', movements);
      })
      .then(function () {
        return connect.basicPost('purchase', [{ uuid : session.cfg.purchase_uuid, paid : 1 }], ['uuid']);
      })
      .then(function () {
        messenger.success("STOCK.ENTRY.WRITE_SUCCESS");
      })
      .catch(function (error) {
        messenger.error("STOCK.ENTRY.WRITE_ERROR");
      });
    };

  }
]);