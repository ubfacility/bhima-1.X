angular.module('kpk.controllers').controller('reportFinanceController', function($scope, $q, connect) {
  //TODO required model - if the model has no data, the page should not load and report this to the user
  
  //Models
  var models = {};
  models['fiscal'] = {
    model: {}, 
    request: {
      tables: {
        'fiscal_year': { 
          columns: ['enterprise_id', 'id', 'start_month', 'start_year', 'previous_fiscal_year']
        }
      }
    }
  }
  models['debitor'] = {
    model: {},
    request: {
      tables: { 
        'debitor': { 
          columns: ['id', 'group_id', 'text']
        }
      }
    }
  }


  //Error handling 
  $scope.session_error = {valid: true};

  function init() { 
    //TODO rename promise

    var promise = populateModels(models);
    promise
    //Populate Models - Success
    .then(function(model_list) { 
      return verifyReceived(model_list);
    }, 
    //Populate Models - Error
    function(err) { 
      handleError(err);
    })
    //Verify Models - Success
    .then(function(res) { 

    },
    //Veryify Models - Error
    function(err) { 
      handleError(err);
    });
  }

  function renderGrid() {

  }

  function populateModels(model_list) { 
    /*summary
    *   generic method to request data for any number of provided models
    */
    var deferred = $q.defer(); 
    var promise_list = [];

    for(item in model_list) { 
      promise_list.push(connect.req(model_list[item].request));
    }

    //Loop is bad, link models in a different way
    $q.all(promise_list)
    .then(function(res) { 
      //Success 
      var i = 0;
      for(item in models) { 
        model_list[item].model = res[i];
        i++;
      }
      deferred.resolve(model_list);
    }, function(err) { 
      deferred.reject(err);
    });
    return deferred.promise;
  }

  //TODO rename verifyReceived()
  function verifyReceived(model_list) { 
    /*summary
    *   verify that data recieved from the server is correct and usable - if not inform the user
    */
    var deferred = $q.defer();
    var test_list = {};

    test_list['fiscal'] = {
      method: function verifyFiscal() { 
        if(model_list['fiscal'].model.data.length===0) return false;
        return true;
      },
      err: { 
        //Arbitrarily means test fails (see handleError)
        status: 800,
        fail_body: "No Fiscal Year records located, Fiscal Years are required to group transactions and provide reports."
      }
    }

    test_list['debitor'] = {
      method: function verifyDebitor() { 
        if(model_list['debitor'].model.data.length===0) return false;
        return true;
      },
      err: { 
        //Arbitrarily means test fails (see handleError)
        status: 800,
        fail_body: "No Debitors located."
      }
    }

    //iterate through tests
    for(test in test_list) { 
      if(!test_list[test].method()) deferred.reject(test_list[test].err);
    }
    
    //All tests passed
    deferred.resolve();
    return deferred.promise;
  }

  //TODO renmae handleError()
  function handleError(err) { 
    if(!err) err = {};

    //only account for two types of error - could use numbered system to allow for more
    var HTTP_ERROR = true;
    var CLIENT_ERROR = false;

    var error_status = err.status || null;

    //Assume the error is HTTP 
    var error_type = err.http || CLIENT_ERROR;
    var error_body, error_title;

    var default_error = { 
      type: "error", 
      body: "Unkonwn error",
      title: ""
    }

    //This is bad and wrong and ...
    var style_map = { 
      "info" : "alert-info",
      "error" : "alert-danger",
      "default" : "alert-warning"
    }

    var error_map = {};
    error_map[HTTP_ERROR] = {
      500: {
        type: "error",
        body:  "The server encountered an error processing `" + err.table + "`. If this problem persists please contact the sysadmin.", 
        title: ""
      },
      404: { 
        type: "error",
        body: "The server could not find `" + err.table + "`. If this problem persists please contact the sysadmin.",
        title: ""
      }
    }

    error_map[CLIENT_ERROR] = {
      //Arbitrarily means a test didn't pass
      800: { 
        type: "info",
        body: err.fail_body,
        title: err.fail_title
      }
    }

    //Default
    var e = error_map[error_type][error_status];
    if(!e) e = default_error;

    //Expose error to view
    $scope.session_error.type = style_map[e.type] || style_map["default"];
    $scope.session_error.body = e.body;
    $scope.session_error.valid = false;
  }
  
  init();
});