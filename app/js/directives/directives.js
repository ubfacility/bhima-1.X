// js/directives/directives.js

(function (angular) {
  'use strict';

  angular.module('kpk.directives', [])

    .directive('ngFocus', ['$parse', function ($parse) {
      return function(scope, element, attr) {
        var fn = $parse(attr.ngFocus);
        element.bind('focus', function (event) {
          scope.$apply(function () {
            fn(scope, {$event:event});
          });
        });
      };
    }])
     
    .directive('ngBlur', ['$parse', function ($parse) {
      return function(scope, element, attr) {
        var fn = $parse(attr.ngBlur);
        element.bind('blur', function (event) {
          scope.$apply(function () {
            fn(scope, {$event:event});
          });
        });
      };
    }])

    .directive('kpkAlert', ['$compile', function ($compile) {
      return {
        restrict: 'A',
        replace: true,
        link: function ($scope, element, attrs) {
          var template = 
            '<div class="kapok-alert">' + 
              '<alert type="alert.type" close="closeAlert()">{{alert.message}}</alert>' + 
            '</div>';

        }
      };
    
    }])

    .directive('reportGroupCompile', ['$compile', function($compile) { 

      //TODO Currently tries too hard to use generic templating and ends up being a tightly coupled (slow) operation 
      //replace with functions that build array templates and join()
      return { 
        restrict: 'A',
        link: function(scope, element, attrs) { 
          var built = false, template = [];
          var groupModel = attrs.groupModel, tableDefinition = attrs.tableDefinition;  
          var accountRowTemplate = "<tr><td>%d</td><td %s>%s</td>%s</tr>"; 
          var accountTotalTemplate = "<tr><td></td><td %s'>%s</td>%s</tr>"; 

          if(groupModel && tableDefinition) { 
            scope.$watch(groupModel, function(nval, oval) { 
              if(!built && nval.length > 0) buildTable(nval); //Remove directive $watch
            }, true);
          }

          function buildTable(data) { 
            built = true;
            parseGroup(data);
            
            //TODO append to element vs replace (attach to tbody)
            element.replaceWith($compile(template.join(''))(scope)); 
          } 
          
          function parseGroup(accountGroup) { 
            accountGroup.forEach(function(account) { 
              var detail = account.detail, style = buildAccountStyle(detail); 
              
              //Row for group detail 
              template.push(printf(accountRowTemplate, detail.account_number, style, detail.account_txt, buildAccountColumns(detail, false)));
              if(!account.accounts) return;
              
              //Group children 
              parseGroup(account.accounts); 

              //Total row 
              template.push(printf(accountTotalTemplate, printf('style="padding-left: %dpx; font-weight: bold;"', detail.depth * 30), "Total " + detail.account_txt, buildAccountColumns(detail, true)));
            });
          }

          function buildAccountStyle(detail) { 
           
            //FIXME hardcoded account type definition
            var styleTemplate = "", colspanTemplate = "", classTemplate = "", title = (detail.account_type_id === 3);
              
            styleTemplate = printf('style="padding-left: %dpx;"', detail.depth * 30);
            if(title) { 
              colspanTemplate = printf('colspan="%d"', scope[tableDefinition].columns.length + 1);
              classTemplate = 'class="reportTitle"';
            }
            return printf('%s %s %s', styleTemplate, colspanTemplate, classTemplate);
          }

          function buildAccountColumns(detail, isTotal) {  
            if(detail.account_type_id === 3 && !isTotal) return "";

            var columnTemplate = [], data = isTotal ? detail.total : detail;
            scope[tableDefinition].columns.forEach(function(column) { 
              columnTemplate.push(printf('<td %s>%d</td>', (isTotal ? 'style="font-weight: bold;"' : ''), data[column.key] || 0));
            });
            return columnTemplate.join('');
          }
          
          //Naive templating function 
          function printf(template) { 
            var typeIndex = [], tempTemplate = template, shift = 0; 
            var replaceArguments = []; 
            var types = { 
              '%s' : '[object String]',
              '%d' : '[object Number]',
              '%l' : '[object Array]'
            }
            
            //read arguments - not sure how much 'use strict' aproves of this
            for(var i = 1; i < arguments.length; i++) { 
              replaceArguments.push(arguments[i]);
            }
          
            Object.keys(types).forEach(function(matchKey) { 
              var index = tempTemplate.indexOf(matchKey);
              while(index >= 0) { 
                typeIndex.push({index: index, matchKey: matchKey});
                tempTemplate = tempTemplate.replace(matchKey, '');
                index = tempTemplate.indexOf(matchKey);
              }
            });
            
            typeIndex.sort(function(a, b) { return a.index > b.index; });
            typeIndex.forEach(function(replaceObj, index) {  
              var targetArg = replaceArguments[index], replaceIndex = replaceObj.index + shift, matchKey = typeIndex[replaceIndex];
              if(Object.prototype.toString.call(targetArg) != types[replaceObj.matchKey]) throw new Error("Argument " + targetArg + " is not " + types[replaceObj.matchKey]); 
              template = template.replace(replaceObj.matchKey, targetArg);
              shift += targetArg.length; 
            });
            return template;
          }
        }
      };
    }])
  
    .directive('reportGroup', ['$compile', function($compile) { 
      return { 
        restrict: 'A',
        link: function(scope, element, attrs) { 
          var groupModel = attrs.groupModel;
          var template = [
            '<tr data-ng-repeat-start="group in ' + groupModel + '">',
            '<td style="text-align: right">{{group.detail.account_number}}</td>',
            '<td ng-class="{\'reportTitle\': group.detail.account_type_id==3}" ng-style="{\'padding-left\': group.detail.depth * 30 + \'px\'}">{{group.detail.account_txt}}</td>', 
            '<td ng-repeat="column in tableDefinition.columns"><span ng-hide="group.detail.account_type_id==3">{{(group.detail[column.key] || 0) | currency}}</span></td>',
            '</tr>',
            '<tr ng-if="group.accounts" data-report-group data-group-model="group.accounts"></tr>',
            '<tr ng-if="group.detail.account_type_id == 3" data-ng-repeat-end><td></td><td ng-style="{\'padding-left\': group.detail.depth * 30 + \'px\'}"><em>Total {{group.detail.account_txt}}</em></td><td ng-repeat="column in tableDefinition.columns"><b>{{group.detail.total[column.key] | currency}}</b></td></tr>'
          ]; 
          
          if(attrs.groupModel){
            element.replaceWith($compile(template.join(''))(scope));
          }
        }
      };
    }])

    .directive('treeModel', ['$compile', 'appcache', function($compile, appcache) {
      var MODULE_NAMESPACE = 'tree';
      var cache = new appcache(MODULE_NAMESPACE);
      
      return {
        restrict: 'A',
        link: function (scope, element, attrs) {
          console.timeEnd("directive_timestamp");
          var treeId = attrs.treeId;
          var treeModel = attrs.treeModel;
          var nodeId = attrs.nodeId || 'id';
          var nodeLabel = attrs.nodeLabel || 'label';
          var nodeChildren = attrs.nodeChildren || 'children'; 
          var template = 
            '<ul>' + 
              '<li data-ng-repeat="node in ' + treeModel + '">' + 
              //FIXME: Strange mix of CSS and HTML with glyphicons - see if there's a better way
                '<i class="collapsed glyphicon glyphicon-folder-close" data-ng-show="node.' + nodeChildren + '.length && node.collapsed" data-ng-click="' + treeId + '.selectNodeHead(node)"></i> ' + 
                '<i class="expanded glyphicon glyphicon-folder-open" data-ng-show="node.' + nodeChildren + '.length && !node.collapsed" data-ng-click="' + treeId + '.selectNodeHead(node)"></i> ' + 
                '<i class="normal glyphicon glyphicon-file" data-ng-hide="node.' + nodeChildren + '.length"></i> ' + 
                '<span data-ng-class="node.selected" data-ng-click="' + treeId + '.selectNodeLabel(node)">{{node.' + nodeLabel + '}}</span>' + 
                '<div data-ng-hide="node.collapsed" data-tree-id="' + treeId + '" data-tree-model="node.' + nodeChildren + '" data-node-id=' + nodeId + ' data-node-label=' + nodeLabel + ' data-node-children=' + nodeChildren + '></div>' + 
              '</li>' + 
            '</ul>';
          
          //Collapse by default
          if (scope.node) scope.node.collapsed = true;

          //Assign select/ collapse methods - should only occur once
          if (treeId && treeModel) {
            if (attrs.angularTreeview) {
              scope[treeId] = scope[treeId] || {};
              scope[treeId].selectNodeHead = scope[treeId].selectNodeHead || function (selectedNode) {
                selectedNode.collapsed = !selectedNode.collapsed;
                
                //update store 
                cache.put(selectedNode.id_unit, {collapsed: selectedNode.collapsed});
              };
              scope[treeId].selectNodeLabel = scope[treeId].selectNodeLabel || function (selectedNode) {
                if (scope[treeId].currentNode && scope[treeId].currentNode.selected) {
                  scope[treeId].currentNode.selected = undefined;
                }
                selectedNode.selected = 'selected';
                scope[treeId].currentNode = selectedNode;
              };
            }
            element.html('').append($compile(template)(scope));
          }
        }
      };
    }])

    .directive('kCalculator', function () {

      return {
        restrict: 'EA',
        template :
          '<table>' +
          '  <tbody>' +
          '    <tr>' +
          '      <th colspan="3"><div class="form-kapok"><span class="pull-right">{{ dashboard }}</span></div></th>' +
          '      <th><span class="btn btn-success" ng-click="clear()">CE</span></th>' +
          '    </tr>' +
          '    <tr>' +
          '      <td><button type="button" class="btn btn-default" style="width:100%;" ng-click="push(7)">7</button></td>' +
          '      <td><button type="button" class="btn btn-default" style="width:100%;" ng-click="push(8)">8</button></td>' +
          '      <td><button type="button" class="btn btn-default" style="width:100%;" ng-click="push(9)">9</button></td>' +
          '      <td><button type="button" class="btn btn-default" style="width:100%;" ng-click="push(\'*\')">x</button></td>' +
          '    </tr>' +
          '    <tr>' +
          '      <td><button type="button" class="btn btn-default" style="width:100%;" ng-click="push(4)">4</button></td>' +
          '      <td><button type="button" class="btn btn-default" style="width:100%;" ng-click="push(5)">5</button></td>' +
          '      <td><button type="button" class="btn btn-default" style="width:100%;" ng-click="push(6)">6</button></td>' +
          '      <td><button type="button" class="btn btn-default" style="width:100%;" ng-click="push(\'-\')">-</button></td>' +
          '    </tr>' +
          '    <tr>' +
          '      <td><button type="button" class="btn btn-default" style="width:100%;" ng-click="push(1)">1</button></td>' +
          '      <td><button type="button" class="btn btn-default" style="width:100%;" ng-click="push(2)">2</button></td>' +
          '      <td><button type="button" class="btn btn-default" style="width:100%;" ng-click="push(3)">3</button></td>' +
          '      <td><button type="button" class="btn btn-default" style="width:100%;" ng-click="push(\'/\')">/</button></td>' +
          '    </tr>' +
          '    <tr>' +
          '      <td><button type="button" class="btn btn-default" style="width:100%;" ng-click="push(0)">0</button></td>' +
          '      <td><button type="button" class="btn btn-default" style="width:100%;" ng-click="push(\'.\')">.</button></td>' +
          '      <td><button type="button" class="btn btn-default" style="width:100%;" ng-click="calculate()">=</button></td>' +
          '      <td rowspan="1"><button class="btn btn-default" style="height:100%; width:100%; padding: 0;" ng-click="push(\'+\')">+</button></td>' +
          '    </tr>' +
          '  </tbody>' +
          '</table>',
        scope : {
          'kCalculator' : '=',
        },
        controller : ['$scope', function ($scope) {
          $scope.value = 0;
          $scope.dashboard = '';
          $scope.elements = [];

          $scope.$watch('elements', function () {
            $scope.dashboard = $scope.elements.join('');
          }, true);

          $scope.push = function (operator) {
            $scope.elements.push(operator);
          };  

          $scope.clear = function () {
            $scope.elements.length = 0; 
          };  

          $scope.calculate = function () {
            var temp = $scope.elements.join('');
            $scope.value = eval(temp);
            $scope.elements.length = 0;
            $scope.elements.push($scope.value); // set the value to be an element
          };

        }],
        link: function (scope, element, attrs) {

          scope.$watch('value', function() {
            console.log('Calculated : ', scope.value);
          }, true);

        }
      };
    });
})(angular);
