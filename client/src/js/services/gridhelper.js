/** helper functions for working with DataView and slickgrids*/
angular.module('bhima.services')
.factory('GridHelperFactory', function () {
  // utilities for dataviews

  var service = {
    sorting : {},
    filtering : {},
    grouping : {},
    columns : {}
  };


  /** Column Utilities */

  // These column utitilites eliminate redundency by encapsulating
  // common actions on columns.  Currently supported:
  // service.columns.toggleVisibleColumns(grid, columns):

  // filter out columns with a false-y visible property
  service.columns.toggleVisibileColumns = function (grid, columns) {
    var visibleColumns = columns.filter(function (column) {
      return column.visible;
    });
    grid.setColumns(columns);
  };


  /** Sort Utilities */

  // Sort utilities provides the framework for generic sorting on
  // any column of the grid.

  // create a sort function for a column
  function sortFn(column) {
    return function (a,b) {
      var x = a[column], y = b[column];
      return x - y;
    };
  }

  // set up default sorting on the grid by column
  service.sorting.setupSorting = function (grid, dataview) {

    // set up the listener
    grid.onSort.subscribe(function (evt, args) {
      var key = args.sortCol.field,
          sorter = sortFn(key);

      dataview.sort(sorter, args.sortAsc);
    });
  };


  /** Group/Grouping Utilities */

  // Grouping utilities include variosu formatting options for collapsed
  // groups as well as aggregators.

  /** collapsed is a boolean */
  service.grouping.byTransaction = function (dataview, collapsed) {
    var formatter = function (g) {
      return '<span>TRANSACTION (' + g.value + ')</span>';
    };

    dataview.setGrouping({
      getter: 'trans_id',
      formatter: formatter,
      comparer : function (a, b) {
        var x =  parseFloat(a.groupingKey.substr(3));
        var y =  parseFloat(b.groupingKey.substr(3));
        return x > y ? 1 : -1;
      },
      aggregators: [
        new Slick.Data.Aggregators.Sum('debit'),
        new Slick.Data.Aggregators.Sum('credit'),
        new Slick.Data.Aggregators.Sum('debit_equiv'),
        new Slick.Data.Aggregators.Sum('credit_equiv')
      ],
      aggregateCollapsed: collapsed,
      lazyTotalsCalculation : true
    });
  };

  service.grouping.byAccount = function (dataview, collapsed) {
    var formatter = function (g) {
      return '<span>ACCOUNT (' + g.value + ')</span>';
    };
    dataview.setGrouping({
      getter: 'account_id',
      formatter: formatter,
      aggregators: [
        new Slick.Data.Aggregators.Sum('debit'),
        new Slick.Data.Aggregators.Sum('credit'),
        new Slick.Data.Aggregators.Sum('debit_equiv'),
        new Slick.Data.Aggregators.Sum('credit_equiv')
      ],
      aggregateCollapsed: collapsed,
      lazyTotalsCalculation : true
    });
  };

  // clears the grouping
  service.grouping.clear = function (dataview) {
    dataview.setGrouping({});
  };

  /** Filter utilities */

  // Filtering works on a single column stored in the 'by' parameter
  // of the filter object.  Once the fitler is created, it can be
  // updated by using service.filtering.update(dv, filter).
  //
  // With the exception of the service.filtering.filter() method,
  // all other methods accept a dataview as the first parameter and
  // the filter object as the second.
  //
  // The current filter parameter is provided in the 'by' property
  // of the fitler property.

  // returns a new filter object
  service.filtering.filter = function () {
    return { by : {} };
  };

  // clears the data in the filter and dataview
  service.filtering.clear = function (dataview, filter) {
    filter.by = '';
    dataview.setFilterArgs(filter);
    dataview.refresh();
  };

  // updates the dataview to filter with the new parameter provided in filter
  service.filtering.update = function (dataview, filter) {
    if (!filter.by) { return; }
    dataview.setFilterArgs(filter);
    dataview.refresh();
  };

  return service;
});
