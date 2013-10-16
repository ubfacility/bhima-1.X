'use strict';

//FIXME: Format code correctly in seperate files/modules etc.
var bika = angular.module('bika', ['bika.services', 'bika.controllers', 'angularTreeview', 'ngGrid']);

function bikaconfig($routeProvider) { 
	$routeProvider.
	when('/budgeting', {
		controller: 'budgetController',
		templateUrl: 'partials/budgeting.html'
	}).
	when('/permission', { 
		controller: 'userController',
		templateUrl: '/partials/userpermissions.html'
	}).
	when('/debtors', { 
		controller: 'debtorsController',
		templateUrl: 'partials/debtors.html'
	}).
	when('/fiscal', {
		controller: 'fiscalController',
		templateUrl: 'partials/fiscal.html'
	}).
	when('/chartofaccounts', {
		controller: 'chartController',
		templateUrl: 'partials/chartofaccounts.html'
	});
}

bika.config(bikaconfig);