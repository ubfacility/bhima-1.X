angular.module('kpk.controllers')
.controller('stock.entry.partition', [
  '$scope',
  '$location',
  'store',
  'appstate',
  'messenger',
  'connect',
  'precision',
  'uuid',
  function ($scope, $location, Store, appstate, messenger, connect, precision, uuid) {

    // TODOs
    // . Ensure that tracking numbers are unique.
    // . Clean up totalling code
    // . Clean up transition code between modules (no angular.extend())

    var session = $scope.session = {
      lots : new Store({ identifier : 'uuid', data : [] }),
    };

    var triage = $scope.triage = { codes : [] };

    function Lot () {
      this.id = uuid();
      this.inventory_uuid = null;
      this.purchase_order_uuid = null;
      this.expiration_date = null;
      this.date = new Date();
      this.lot_number = 0;
      this.tracking_number = 0;
      this.quantity = 0;
      this.active = true;
      this.valid = true;
    }

    function startup (db) {
      if (!db) { return messenger.danger('ERR.NOT_FOUND'); }
      session.lots.post(new Lot());
      angular.extend(session, db);

      // perform triage of the data
      session.order.data.forEach(function (drug) {
        if (triage.codes.indexOf(drug.code) < 0) {
          triage.codes.push(drug.code);
        }
      });

      // set up inventory totals
      session.totals.inventory = {};

      $scope.$watch('session.lots.data', function () {
        if (!session.lots.data) { return; }

        var inv = session.totals.inventory;

        for (var k in inv) {
          if (inv.hasOwnProperty(k.toString())) {
            inv[k] = 0;
          }
        }

        session.lots.data.forEach(function (lot) {
          if (!inv[lot.inventory_code]) { inv[lot.inventory_code] = 0; }
          inv[lot.inventory_code] += lot.quantity;
        });

      }, true);
    }

    function error (err) {
      messenger.error(err);
    }

    appstate.register('project', function (project) {
      $scope.project = project;
      startup(appstate.get('stock.data'));
    });

    $scope.add = function add () {
      session.lots.post(new Lot());
    };

    $scope.edit = function edit (lot) {
      lot.active = true;
      lot.oldTotal = session.totals.inventory[lot.inventory_code];
    };

    $scope.commit = function commit (lot) {
      var old, unitPrice, ref = session.order.get(lot.inventory_code);

      lot.active = false;
      lot.purchase_order_uuid = session.cfg.purchase_uuid;
      lot.inventory_uuid = ref.inventory_uuid;

      // calculate using the actual purchase unit price
      unitPrice = precision.round(ref.purchase_price / ref.quantity);
      lot.purchase_price = precision.round(unitPrice * lot.quantity);
      lot.valid = validateLot(lot);
    };


    $scope.remove = function remove (lot) {
      session.lots.remove(lot.uuid);
    };

    $scope.back = function back () {
      $location.path('/stock/entry/start');
    };

    $scope.setQuantity = function setQuantity (lot) {
      var reference, max, code = lot.inventory_code;

      session.order.data.forEach(function (drug) {
        if (drug.code === lot.inventory_code) { reference = drug; }
      });

      var saved = session.totals.inventory[code];
      lot.quantity = !!saved ? reference.quantity - saved.total > 0 ? reference.quantity - saved.total : 0 : reference.quantity;
    };

    function validateLot (lot) {
      var valid = {};
      valid.quantity = !Number.isNaN(Number(lot.quantity));
      valid.expiration_date = !Number.isNaN(new Date(lot.expiration_date).getDate());
      valid.tracking_number = !!lot.tracking_number;
      valid.purchase_order_uuid = !!lot.purchase_order_uuid;
      valid.inventory_code = triage.codes.indexOf(lot.inventory_code) > -1;

      return valid.quantity && valid.expiration_date &&
        valid.tracking_number && valid.purchase_order_uuid &&
        valid.inventory_code;
    }

    $scope.review = function review () {
      var hasErrors = session.lots.data.every(function (lot) {
        return !!lot.valid;
      });

      if (!hasErrors) { return messenger.danger('Selection has errors'); }

      var isBalanced = session.order.data.every(function (o) {
        return session.totals.inventory[o.code] === o.quantity;
      });

      if (!isBalanced) { return messenger.danger('Allocated amounts do not match purchase order amounts.'); }
      appstate.set('stock.data', session);

      $location.path('/stock/entry/review');
    };
  }
]);