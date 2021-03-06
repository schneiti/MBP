/* global app */


/**
 * Controller for the sensor list page.
 */
app.controller('TestingController',
    ['$scope', '$controller', '$interval', '$http', 'testList', '$rootScope', 'addTest', 'deleteTest', 'ruleList', 'sensorList', '$q', 'ComponentService', 'FileReader', 'ENDPOINT_URI', 'NotificationService',
        function ($scope, $controller, $interval, $http, testList, $rootScope, addTest, deleteTest, ruleList, sensorList, $q, ComponentService, FileReader, ENDPOINT_URI, NotificationService) {

            const vm = this;
            vm.ruleList = ruleList;
            //Stores the parameters and their values as assigned by the user
            vm.parameterValues = [];
            //Settings objects that contains application settings for this page
            vm.useNewData = true;
            vm.testName = "";
            vm.rulesPDF = [];
            vm.availableSensors = [];
            vm.realSensorList = [];
            const sensorListSim = ['TestingTemperaturSensor', 'TestingTemperaturSensorPl', 'TestingFeuchtigkeitsSensor', 'TestingFeuchtigkeitsSensorPl', 'TestingBeschleunigungsSensor', 'TestingBeschleunigungsSensorPl', 'TestingGPSSensor', 'TestingGPSSensorPl'];

            vm.test = "";
            vm.addSimulator = false;
            vm.addRealSensor = false;


            /**
             * Initializing function, sets up basic things.
             */
            (function initController() {
                vm.availableSensors = [];
                //Check if the test list was retrieved successfully
                if (testList == null) {
                    NotificationService.notify("Could not retrieve test list.", "error");
                }

                //Initialize parameters and retrieve states and stats
                // initParameters();

                getDevice();
                checkActuatorReg();
                for (let i = 0; i < sensorListSim.length; i++) {
                    checkSensorReg(sensorListSim[i]);
                }
                $scope.availableSensors = vm.availableSensors;
                $scope.realSensorList = vm.realSensorList;

                //Interval for updating sensor states on a regular basis
                const interval = $interval(function () {
                    getDevice();
                    //   checkActuatorReg();
                    //  checkSensorReg();
                }, 5 * 60 * 1000);

                //Refresh test select picker when the modal is opened
                $('.modal').on('shown.bs.modal', function () {
                    $('.selectpicker').selectpicker('refresh');
                });

                //Cancel interval on route change
                $scope.$on('$destroy', function () {
                    $interval.cancel(interval);
                });
            })();


            /**
             * Performs a server request in order to start a test given by its id.
             *
             * @param testId
             * @param item
             */
            function executeTest(testId, item) {
                $http.post(ENDPOINT_URI + '/test-details/test/' + testId, testId.toString()).success(function successCallback(responseTest) {
                }, function (response) {
                });
            }

            /**
             * Performs a server request in order to stop a test given by its id.
             *
             * @param testId
             */
            function stopTest(testId) {
                vm.http = $http.post(ENDPOINT_URI + '/test-details/test/stop/' + testId, testId.toString()).then(function (response) {
                }, function (response) {
                });

            }


            /**
             * Sends a server request to find out if a test report is available for the specific test.
             *
             * @param testId
             * @param testName
             */
            function refreshTestEntry(testId, testName) {

                $http.get(ENDPOINT_URI + '/test-details/pdfExists/' + testId).then(function (response) {
                    switch (response) {
                        case "true":
                            document.getElementById(testName).disabled = false;
                            break;
                        case "false":
                            document.getElementById(testName).disabled = true;
                            break;
                    }
                });
            }


            /**
             * Sends a server request to open the test report of a specific test fiven by its id.
             *
             * @param testID
             */
            function downloadPDF(testID, endtimeUnix) {
                window.open('api/test-details/downloadPDF/' + testID + "_" + endtimeUnix, '_blank');
            }


            /**
             * Check if Test-Device is already registered or not.
             */
            function getDevice() {
                $http.get(ENDPOINT_URI + '/devices').success(function (response) {

                    $scope.device = 'LOADING';

                    $scope.device = "NOT_REGISTERED";
                    angular.forEach(response._embedded.devices, function (value) {
                        if (value.name === "TestingDevice") {
                            $scope.device = "REGISTERED";
                        }
                    });
                });
            }

            /**
             * Register Test Device and update the registered status.
             */
            function registerTestDevice() {
                param =
                    {
                        "name": "TestingDevice",
                        "componentType": "Computer",
                        "ipAddress": "192.168.221.167",
                        "username": "ubuntu",
                        "password": "simulation",
                        "errors": {}
                    };
                $http.post(ENDPOINT_URI + '/devices/', param).then(function success(response) {
                    getDevice();
                    //Notify the user
                    NotificationService.notify('Entity successfully created.', 'success')
                });

            }

            /**
             * Check if Actuator simulator is already registered or not.
             */
            function checkActuatorReg() {
                $http.get(ENDPOINT_URI + '/actuators').success(function (response) {
                    registered = "NOT_REGISTERED";
                    angular.forEach(response._embedded.actuators, function (value) {
                        if (value.name === "TestingActuator") {
                            registered = "REGISTERED";
                        }
                    });
                    $scope.testingActuator = registered;
                });
            }


            /**
             * Register the Actuator-Simulator for the Test of IoT-Applications.
             */
            function registerTestingActuator() {
                operatorsExists = false;
                deviceExists = false;

                // Check if the required Operator for the actuator simulator exists
                $http.get(ENDPOINT_URI + '/operators').success(function (response) {
                    angular.forEach(response._embedded.operators, function (value) {
                        if (value.name === "TestingActuator") {
                            operatorLink = value._links.self.href;
                            operatorsExists = true;
                        }
                    });

                    // Check if the required Testing device for the actuator simulator exists
                    $http.get(ENDPOINT_URI + '/devices').success(function (response) {
                        angular.forEach(response._embedded.devices, function (value) {
                            if (value.name === "TestingDevice") {
                                deviceLink = value._links.self.href;
                                deviceExists = true;
                            }
                        });

                        // if the specific operator and the Testing device exists a server request for the registration is performed
                        if (deviceExists && operatorsExists) {

                            // Parameters for the actuator simulator registration
                            param = {
                                "name": "TestingActuator",
                                "componentType": "Buzzer",
                                "operator": operatorLink,
                                "device": deviceLink,
                                "errors": {}
                            };

                            // Server request for the registration of the testing actuator
                            $http.post(ENDPOINT_URI + '/actuators/', param).then(function success(response) {
                                checkActuatorReg();

                                //Notify the user if actuator is successfully registered
                                NotificationService.notify('Entity successfully created.', 'success')
                            });

                        } else if (!deviceExists && operatorsExists) {
                            // Notify the user if the required Test device for the registration doesn't exist
                            NotificationService.notify("Please register the Testing device first.", "error");
                        } else if (deviceExists && !operatorsExists) {
                            // Notify the user if the required Operator for the registration doesn't exist
                            NotificationService.notify("Please register the corresponding operator first.", "error");
                        } else if (!deviceExists && !operatorsExists) {
                            // Notify the user if the required Operator and Test device for the registration doesn't exist
                            NotificationService.notify("Please register the corresponding operator and Testing device first.", "error");
                        }
                    });

                });

            }


            /**
             * Check if the Sensor-Simulator for the Test is registered.
             *
             * @param sensor
             */
            function checkSensorReg(sensor) {
                try {
                    $http.get(ENDPOINT_URI + '/sensors').success(function (response) {
                        sensorX = false;
                        sensorY = false;
                        sensorZ = false;
                        registered = "NOT_REGISTERED";
                        angular.forEach(response._embedded.sensors, function (value) {
                            if (sensor === 'TestingTemperaturSensor') {
                                if (value.name === sensor) {
                                    registered = "REGISTERED";
                                    vm.availableSensors.push(sensor);
                                }
                            } else if (sensor === 'TestingTemperaturSensorPl') {
                                if (value.name === sensor) {
                                    registered = "REGISTERED";
                                    vm.availableSensors.push(sensor);
                                }
                            } else if (sensor === 'TestingFeuchtigkeitsSensorPl') {
                                if (value.name === sensor) {
                                    registered = "REGISTERED";
                                    vm.availableSensors.push(sensor);
                                }
                            } else if (sensor === 'TestingFeuchtigkeitsSensor') {
                                if (value.name === sensor) {
                                    registered = "REGISTERED";
                                    vm.availableSensors.push(sensor);
                                }
                            } else if (sensor === 'TestingBeschleunigungsSensor') {
                                switch (value.name) {
                                    case "TestingAccelerationX":
                                        sensorX = true;
                                        break;
                                    case "TestingAccelerationY":
                                        sensorY = true;
                                        break;
                                    case "TestingAccelerationZ":
                                        sensorZ = true;
                                        break;
                                }

                            } else if (sensor === 'TestingBeschleunigungsSensorPl') {
                                switch (value.name) {
                                    case "TestingAccelerationPlX":
                                        sensorX = true;
                                        break;
                                    case "TestingAccelerationPlY":
                                        sensorY = true;
                                        break;
                                    case "TestingAccelerationPlZ":
                                        sensorZ = true;
                                        break;
                                }

                            } else if (sensor === "TestingGPSSensor") {
                                switch (value.name) {
                                    case "TestingGPSLatitude":
                                        sensorX = true;
                                        break;
                                    case "TestingGPSLongitude":
                                        sensorY = true;
                                        break;
                                    case "TestingGPSHight":
                                        sensorZ = true;
                                        break;
                                }
                            } else if (sensor === "TestingGPSSensorPl") {
                                switch (value.name) {
                                    case "TestingGPSLatitudePl":
                                        sensorX = true;
                                        break;
                                    case "TestingGPSLongitudePl":
                                        sensorY = true;
                                        break;
                                    case "TestingGPSHightPl":
                                        sensorZ = true;
                                        break;
                                }
                            }
                        });


                        switch (sensor) {
                            case 'TestingTemperaturSensor':
                                $scope.temp = registered;
                                break;
                            case 'TestingTemperaturSensorPl':
                                $scope.tempPl = registered;
                                break;
                            case 'TestingFeuchtigkeitsSensor':
                                $scope.hum = registered;
                                break;
                            case 'TestingFeuchtigkeitsSensorPl':
                                $scope.humPl = registered;
                                break;
                            case 'TestingBeschleunigungsSensor':
                                if (sensorX && sensorY && sensorZ) {
                                    $scope.acc = "REGISTERED";
                                    vm.availableSensors.push(sensor);
                                } else {
                                    $scope.acc = "NOT_REGISTERED";
                                }
                                break;
                            case 'TestingBeschleunigungsSensorPl':
                                if (sensorX && sensorY && sensorZ) {
                                    $scope.accPl = "REGISTERED";
                                    vm.availableSensors.push(sensor);
                                } else {
                                    $scope.accPl = "NOT_REGISTERED";
                                }
                                break;
                            case 'TestingGPSSensor':
                                if (sensorX && sensorY && sensorZ) {
                                    $scope.gps = "REGISTERED";
                                    vm.availableSensors.push(sensor);
                                } else {
                                    $scope.gps = "NOT_REGISTERED";
                                }
                                break;
                            case 'TestingGPSSensorPl':
                                if (sensorX && sensorY && sensorZ) {
                                    $scope.gpsPl = "REGISTERED";
                                    vm.availableSensors.push(sensor);
                                } else {
                                    $scope.gpsPl = "NOT_REGISTERED";
                                }
                                break;
                        }

                    });

                } finally {

                    vm.realSensorList = [];
                    for (let i = 0; i < sensorList.length; i++) {
                        switch (sensorList[i].name) {
                            case 'TestingTemperaturSensorPl':
                                break;
                            case 'TestingTemperaturSensor':
                                break;
                            case 'TestingFeuchtigkeitsSensor':
                                break;
                            case 'TestingFeuchtigkeitsSensorPl':
                                break;
                            case 'TestingBeschleunigungsSensor':
                                break;
                            case 'TestingBeschleunigungsSensorPl':
                                break;
                            case 'TestingGPSSensor':
                                break;
                            case 'TestingGPSSensorPl':
                                break;
                            default:
                                vm.realSensorList.push(sensorList[i]);
                        }

                    }
                }
            }


            /**
             * Register the one dimensional Sensor-Simulator for the Test of IoT-Applications.
             */
            function registerOneDimSensor(sensor) {
                operatorsExists = false;
                deviceExists = false;

                // Check if the required Operator for the specific sensor exists
                $http.get(ENDPOINT_URI + '/operators').success(function (response) {
                    angular.forEach(response._embedded.operators, function (value) {
                        if (value.name === sensor) {
                            sensorName = sensor;
                            operatorLink = value._links.self.href;
                            operatorsExists = true;
                        }
                    });

                    // Check if the required Testing device for the specific sensor exists
                    $http.get(ENDPOINT_URI + '/devices').success(function (response) {
                            angular.forEach(response._embedded.devices, function (value) {
                                if (value.name === "TestingDevice") {
                                    deviceLink = value._links.self.href;
                                    deviceExists = true;
                                }
                            });

                            // if the specific operator and the Testing device exists a server request for the registration is performed
                            if (deviceExists && operatorsExists) {
                                if (sensor === "TestingTemperaturSensor" || sensor === "TestingTemperaturSensorPl") {
                                    componentType = "Temperature";
                                } else if (sensor === "TestingFeuchtigkeitsSensor" || sensor === "TestingFeuchtigkeitsSensorPl") {
                                    componentType = "Humidity";
                                }

                                // Parameters for the sensor simulator registration
                                param = {
                                    "name": sensorName,
                                    "componentType": componentType,
                                    "operator": operatorLink,
                                    "device": deviceLink,
                                    "errors": {}
                                };

                                // Server request for the registration of the specific sensor
                                $http.post(ENDPOINT_URI + '/sensors/', param).then(function success(response) {
                                    checkSensorReg(sensor);

                                    //Notify the user if specific sensor is successfully registered
                                    NotificationService.notify('Entity successfully created.', 'success')
                                });

                            } else if (!deviceExists && operatorsExists) {
                                // Notify the user if the required Test device for the registration doesn't exist
                                NotificationService.notify("Please register the Testing device first.", "error");
                            } else if (deviceExists && !operatorsExists) {
                                // Notify the user if the required Operator for the registration doesn't exist
                                NotificationService.notify("Please register the corresponding operator first.", "error");
                            } else if (!deviceExists && !operatorsExists) {
                                // Notify the user if the required Operator and Test device for the registration doesn't exist
                                NotificationService.notify("Please register the corresponding operator and Testing device first.", "error");
                            }
                        }
                    );
                });
            }

            /**
             * Register the three dimensional Sensor-Simulators for the Test of IoT-Applications.
             */
            function registerThreeDimSensor(sensor) {
                deviceExists = false;
                operatorsExistsX = false;
                operatorsExistsY = false;
                operatorsExistsZ = false;
                switch (sensor) {
                    case "TestingBeschleunigungsSensor":
                        sensorX = "TestingAccelerationX";
                        sensorY = "TestingAccelerationY";
                        sensorZ = "TestingAccelerationZ";
                        componentType = "Motion";
                        break;
                    case "TestingBeschleunigungsSensorPl":
                        sensorX = "TestingAccelerationPlX";
                        sensorY = "TestingAccelerationPlY";
                        sensorZ = "TestingAccelerationPlZ";
                        componentType = "Motion";
                        break;
                    case "TestingGPSSensor":
                        sensorX = "TestingGPSLatitude";
                        sensorY = "TestingGPSLongitude";
                        sensorZ = "TestingGPSHight";
                        componentType = "Location";
                        break;
                    case "TestingGPSSensorPl":
                        sensorX = "TestingGPSLatitudePl";
                        sensorY = "TestingGPSLongitudePl";
                        sensorZ = "TestingGPSHightPl";
                        componentType = "Location";
                        break;
                }

                // Check if the required Operators for the three dimensional sensor simulators exists
                $http.get(ENDPOINT_URI + '/operators').success(function (response) {
                    angular.forEach(response._embedded.operators, function (value) {
                        if (value.name === sensorX) {
                            operatorLinkX = value._links.self.href;
                            operatorsExistsX = true;
                        } else if (value.name === sensorY) {
                            operatorLinkY = value._links.self.href;
                            operatorsExistsY = true;
                        } else if (value.name === sensorZ) {
                            operatorLinkZ = value._links.self.href;
                            operatorsExistsZ = true;
                        }
                    });

                    // Check if the required Testing device for the sensor simulators exists
                    $http.get(ENDPOINT_URI + '/devices').success(function (response) {
                            angular.forEach(response._embedded.devices, function (value) {
                                if (value.name === "TestingDevice") {
                                    deviceLink = value._links.self.href;
                                    deviceExists = true;
                                }
                            });

                            // if the specific operator for one dimension and the Testing device exists a server request for the registration is performed
                            if (deviceExists && operatorsExistsX) {

                                // Parameters for one of the sensor simulators of the three dimensional sensor registration
                                param = {
                                    "name": sensorX,
                                    "componentType": componentType,
                                    "operator": operatorLinkX,
                                    "device": deviceLink,
                                    "errors": {}
                                };

                                // Server request for the registration for one sensor simulator of the three dimensional sensor
                                $http.post(ENDPOINT_URI + '/sensors/', param).then(function success(response) {
                                    checkSensorReg(sensor);

                                    //Notify the user if sensor is successfully registered
                                    NotificationService.notify('Entity successfully created.', 'success')
                                });
                            }

                            // if the specific operator for one dimension and the Testing device exists a server request for the registration is performed
                            if (deviceExists && operatorsExistsY) {

                                // Parameters for one of the sensor simulators of the three dimesional sensor registration
                                param = {
                                    "name": sensorY,
                                    "componentType": componentType,
                                    "operator": operatorLinkY,
                                    "device": deviceLink,
                                    "errors": {}
                                };

                                // Server request for the registration for one sensor simulator of the three dimensional sensor
                                $http.post(ENDPOINT_URI + '/sensors/', param).then(function success(response) {
                                    checkSensorReg(sensor);

                                    //Notify the user if sensor is successfully registered
                                    NotificationService.notify('Entity successfully created.', 'success')
                                });
                            }

                            // if the specific operator for one dimension and the Testing device exists a server request for the registration is performed
                            if (deviceExists && operatorsExistsZ) {

                                // Parameters for one of the sensor simulators of the three dimensional sensor registration
                                param = {
                                    "name": sensorZ,
                                    "componentType": componentType,
                                    "operator": operatorLinkZ,
                                    "device": deviceLink,
                                    "errors": {}
                                };

                                // Server request for the registration for one sensor simulator of the three dimensional sensor
                                $http.post(ENDPOINT_URI + '/sensors/', param).then(function success(response) {
                                    checkSensorReg(sensor);

                                    //Notify the user if sensor is successfully registered
                                    NotificationService.notify('Entity successfully created.', 'success')
                                });

                            } else if (!deviceExists && (operatorsExistsY || operatorsExistsX || operatorsExistsZ)) {
                                // Notify the user if the required Test device for the registration doesn't exist
                                NotificationService.notify("Please register the Testing device first.", "error");
                            } else if (deviceExists && (!operatorsExistsY || !operatorsExistsX || !operatorsExistsZ)) {
                                // Notify the user if one of the required Operators for the registration doesn't exist
                                NotificationService.notify("Please register the corresponding operators first.", "error");
                            } else if (!deviceExists && (!operatorsExistsY || !operatorsExistsX || !operatorsExistsZ)) {
                                // Notify the user if one of the required Operators and Test device for the registration doesn't exist
                                NotificationService.notify("Please register the corresponding operators and Testing device first.", "error");
                            }
                        }
                    );


                });

            }

            /**
             * [Public]
             *Manage the addition or removal of simulated sensors for creating a test.
             */
            function addSimulators() {
                var elem = document.getElementById("addSimulator");
                if (elem.value === "+") {
                    elem.value = "-";
                    vm.addSimulator = true;
                    document.getElementById("addSimulator").innerHTML = '';
                    document.getElementById("addSimulator").innerHTML = '<i class="material-icons">remove</i>';

                } else {
                    elem.value = "+";
                    vm.addSimulator = false;
                    document.getElementById("addSimulator").innerHTML = '';
                    document.getElementById("addSimulator").innerHTML = '<i class="material-icons">add</i>';

                }


            }


            /**
             * [Public]
             * Manage the addition or removal of real sensors for creating a test.
             *
             */
            function addRealSensor() {
                var elemReal = document.getElementById("addRealSensor");
                vm.selectedRealSensor = [];


                if (elemReal.value === '+') {
                    vm.addRealSensors = true;
                    elemReal.value = '-';
                    document.getElementById("addRealSensor").innerHTML = '';
                    document.getElementById("addRealSensor").innerHTML = '<i class="material-icons">remove</i>';


                } else {
                    elemReal.value = '+';
                    vm.addRealSensors = false;
                    document.getElementById("addRealSensor").innerHTML = '';
                    document.getElementById("addRealSensor").innerHTML = '<i class="material-icons">add</i>';
                }
            }


            /**
             * [Public]
             *
             * Sends a server request in order to open a window for downloading/open the specific test report
             *
             * @param testID
             * @param endtimeUnix
             */
            function downloadPDF(testID, endtimeUnix) {
                window.open('api/test-details/downloadPDF/' + testID + "_" + endtimeUnix, '_blank');
            }


            /**
             * [Public]
             * @param test
             * @returns {*}
             */
            $scope.detailsLink = function (test) {
                if (test.id) {
                    return "view/testing-tool/" + test.id;
                }
                return "#";
            };


            /**
             * [Public]
             * Shows an alert that asks the user if he is sure that he wants to delete a certain test.
             *
             * @param data A data object that contains the id of the test that is supposed to be deleted
             * @returns A promise of the user's decision
             */
            function confirmDelete(data) {

                const testId = data.id;
                let testName = "";

                //Determines the tests's name by checking the list
                for (let i = 0; i < testList.length; i++) {
                    if (testId === testList[i].id) {
                        testName = testList[i].name;
                        break;
                    }
                }

                //Show the alert to the user and return the resulting promise
                return Swal.fire({
                    title: 'Delete test',
                    type: 'warning',
                    html: "Are you sure you want to delete this test?",
                    showCancelButton: true,
                    confirmButtonText: 'Delete',
                    confirmButtonClass: 'bg-red',
                    focusConfirm: false,
                    cancelButtonText: 'Cancel'
                });
            }

            /**
             * Retrieve authorization code for the device from the OAuth Authorization server.
             */
            function getDeviceCode() {
                fetch(location.origin + '/MBP/oauth/authorize?client_id=device-client&response_type=code&scope=write', {
                    headers: {
                        // Basic http authentication with username "device-client" and the according password from MBP
                        'Authorization': 'Basic ZGV2aWNlLWNsaWVudDpkZXZpY2U='
                    }
                }).then(function (response) {
                    let chars = response.url.split('?');
                    let code = chars[1].split('=');
                    vm.parameterValues.push({
                        "name": "device_code",
                        "value": code[1]
                    });
                });
            }

            /**
             * Sends a server request in order to edit the configurations of the test "useNewData",
             * so that the latest values of a specific test are reused in the new execution or not
             *
             * @param testId
             * @param useNewData
             */
            function editConfig(testId, useNewData) {
                if (useNewData === true) {
                    $http.post(ENDPOINT_URI + '/test-details/editConfig/' + testId, "false").then(function success(response) {
                        $scope.erfolgreich = response.success;
                    });
                } else if (useNewData === false) {
                    $http.post(ENDPOINT_URI + '/test-details/editConfig/' + testId, "true").then(function success(response) {
                        $scope.erfolgreich = response.success;
                    });
                }
            }


            // expose controller ($controller will auto-add to $scope)
            angular.extend(vm, {


                testListCtrl: $controller('ItemListController as testListCtrl',
                    {
                        $scope: $scope,
                        list: testList
                    }),
                addTestCtrl: $controller('AddItemController as addTestCtrl',
                    {
                        $scope: $scope,
                        entity: 'test',
                        addItem: function (data) {
                            const newTestObject = {};

                            newTestObject.config = [];
                            newTestObject.type = [];


                            try {

                                var checkRealSensor = false;
                                var checkSimSensor = false;


                                if (!angular.isUndefined(vm.selectedRealSensor)) {
                                    if (!angular.isUndefined(vm.parameterVal)) {
                                        for (let x = 0; x < vm.selectedRealSensor.length; x++) {
                                            newTestObject.type.push(vm.selectedRealSensor[x].name);
                                        }

                                        checkRealSensor = true;
                                        angular.forEach(vm.parameterVal, function (parameters, key) {
                                            for (let i = 0; i < vm.selectedRealSensor.length; i++) {
                                                if (vm.selectedRealSensor[i].name === key) {
                                                    vm.parameterValues = [];
                                                    vm.parameterValues.push({
                                                        "name": "ConfigName",
                                                        "value": vm.selectedRealSensor[i].name
                                                    });
                                                    var requiredParams = vm.selectedRealSensor[i]._embedded.operator.parameters;


                                                    //Iterate over all parameters
                                                    for (let i = 0; i < requiredParams.length; i++) {
                                                        //Set empty default values for these parameters
                                                        var value = "";

                                                        if (requiredParams[i].type === "Switch") {
                                                            value = true;
                                                        }
                                                        if (requiredParams[i].name === "device_code") {
                                                            console.log("Requesting code for required parameter device_code.");
                                                            value = getDeviceCode();
                                                            continue;
                                                        }

                                                        //For each parameter, add a tuple (name, value) to the globally accessible parameter array
                                                        vm.parameterValues.push({
                                                            "name": requiredParams[i].name,
                                                            "value": parameters[i]
                                                        });
                                                    }
                                                    newTestObject.config.push(vm.parameterValues);
                                                }
                                            }
                                        });
                                        newTestObject.config.push([{
                                            "name": "ConfigRealSensors",
                                            "value": vm.parameterVal
                                        }])
                                    }
                                }


                                //Extend request parameters for routines and parameters
                                let parameters;
                                // random values Angle and Axis for the GPS-Sensor
                                const randomAngle = Math.floor((Math.random() * 361));
                                const randomAxis = Math.floor((Math.random() * 3));


                                // random values for the direction of the outlier and movement for the acceleration Sensor
                                const directionOutlier = Math.floor(Math.random() * 6);
                                const directionMovement = Math.floor(Math.random() * 6);

                                if (!angular.isUndefined(vm.selectedSensors)) {
                                    checkSimSensor = true;
                                    for (let z = 0; z < vm.selectedSensors.length; z++) {
                                        newTestObject.type.push(vm.selectedSensors[z]);
                                    }
                                    if (vm.selectedSensors.includes('TestingTemperaturSensor')) {

                                        vm.parameterValues = [];
                                        vm.parameterValues.push({
                                            "name": "ConfigName",
                                            "value": 'TestingTemperaturSensor'
                                        });
                                        if (vm.config.eventTemp === '3' || vm.config.eventTemp === '4' || vm.config.eventTemp === '5' || vm.config.eventTemp === '6') {

                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.eventTemp)
                                            });
                                            vm.parameterValues.push({"name": "anomaly", "value": 0});
                                            vm.parameterValues.push({"name": "useNewData", "value": true});

                                        } else {
                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.eventTemp)
                                            });
                                            vm.parameterValues.push({"name": "useNewData", "value": true});
                                            vm.parameterValues.push({"name": "room", "value": vm.config.roomTemp});
                                            vm.parameterValues.push({
                                                "name": "anomaly",
                                                "value": parseInt(vm.config.anomalyTemp)
                                            });
                                        }
                                        newTestObject.config.push(vm.parameterValues);


                                    }

                                    if (vm.selectedSensors.includes('TestingFeuchtigkeitsSensor')) {
                                        vm.parameterValues = [];
                                        vm.parameterValues.push({
                                            "name": "ConfigName",
                                            "value": 'TestingFeuchtigkeitsSensor'
                                        });
                                        if (vm.config.eventHum === '3' || vm.config.eventHum === '4' || vm.config.eventHum === '5' || vm.config.eventHum === '6') {

                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.eventHum)
                                            });
                                            vm.parameterValues.push({"name": "anomaly", "value": 0});
                                            vm.parameterValues.push({"name": "useNewData", "value": true});

                                        } else {
                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.eventHum)
                                            });
                                            vm.parameterValues.push({"name": "useNewData", "value": true});
                                            vm.parameterValues.push({"name": "room", "value": vm.config.roomHum});
                                            vm.parameterValues.push({
                                                "name": "anomaly",
                                                "value": parseInt(vm.config.anomalyHum)
                                            });
                                        }

                                        newTestObject.config.push(vm.parameterValues);
                                    }

                                    if (vm.selectedSensors.includes('TestingTemperaturSensorPl')) {
                                        vm.parameterValues = [];
                                        vm.parameterValues.push({
                                            "name": "ConfigName",
                                            "value": 'TestingTemperaturSensorPl'
                                        });
                                        if (vm.config.eventTempPl === '3' || vm.config.eventTempPl === '4' || vm.config.eventTempPl === '5' || vm.config.eventTempPl === '6') {
                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.eventTempPl)
                                            });
                                            vm.parameterValues.push({"name": "anomaly", "value": 0});
                                            vm.parameterValues.push({"name": "useNewData", "value": true});
                                            vm.parameterValues.push({"name": "simTime", "value": vm.config.simTime});
                                            vm.parameterValues.push({
                                                "name": "amountEvents",
                                                "value": vm.config.amountEvents
                                            });
                                            vm.parameterValues.push({
                                                "name": "amountAnomalies",
                                                "value": vm.config.amountAnomalies
                                            });
                                        } else {
                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.event)
                                            });
                                            vm.parameterValues.push({"name": "useNewData", "value": true});
                                            vm.parameterValues.push({"name": "simTime", "value": vm.config.simTime});
                                            vm.parameterValues.push({
                                                "name": "amountEvents",
                                                "value": vm.config.amountEvents
                                            });
                                            vm.parameterValues.push({
                                                "name": "amountAnomalies",
                                                "value": vm.config.amountAnomalies
                                            });
                                            vm.parameterValues.push({"name": "room", "value": vm.config.roomTempPl});
                                            vm.parameterValues.push({
                                                "name": "anomaly",
                                                "value": parseInt(vm.config.anomalyTempPl)
                                            });

                                        }
                                        newTestObject.config.push(vm.parameterValues);
                                    }

                                    if (vm.selectedSensors.includes('TestingFeuchtigkeitsSensorPl')) {
                                        vm.parameterValues = [];
                                        vm.parameterValues.push({
                                            "name": "ConfigName",
                                            "value": 'TestingFeuchtigkeitsSensorPl'
                                        });
                                        if (vm.config.eventHumPl === '3' || vm.config.eventHumPl === '4' || vm.config.eventHumPl === '5' || vm.config.eventHumPl === '6') {
                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.eventHumPl)
                                            });
                                            vm.parameterValues.push({"name": "anomaly", "value": 0});
                                            vm.parameterValues.push({"name": "useNewData", "value": true});
                                            vm.parameterValues.push({"name": "simTime", "value": vm.config.simTime});
                                            vm.parameterValues.push({
                                                "name": "amountEvents",
                                                "value": vm.config.amountEvents
                                            });
                                            vm.parameterValues.push({
                                                "name": "amountAnomalies",
                                                "value": vm.config.amountAnomalies
                                            });
                                        } else {
                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.eventHumPl)
                                            });
                                            vm.parameterValues.push({"name": "useNewData", "value": true});
                                            vm.parameterValues.push({"name": "simTime", "value": vm.config.simTime});
                                            vm.parameterValues.push({
                                                "name": "amountEvents",
                                                "value": vm.config.amountEvents
                                            });
                                            vm.parameterValues.push({
                                                "name": "amountAnomalies",
                                                "value": vm.config.amountAnomalies
                                            });
                                            vm.parameterValues.push({"name": "room", "value": vm.config.roomHumPl});
                                            vm.parameterValues.push({
                                                "name": "anomaly",
                                                "value": parseInt(vm.config.anomalyHumPl)
                                            });

                                        }
                                        newTestObject.config.push(vm.parameterValues);
                                    }

                                    if (vm.selectedSensors.includes('TestingGPSSensor')) {
                                        vm.parameterValues = [];
                                        vm.parameterValues.push({
                                            "name": "ConfigName",
                                            "value": 'TestingGPSSensor'
                                        });
                                        if (vm.config.eventGPS === '3' || vm.config.eventGPS === '4' || vm.config.eventGPS === '5') {
                                            vm.parameterValues.push({"name": "who", "value": vm.config.whoGPS});
                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.eventGPS)
                                            });
                                            vm.parameterValues.push({"name": "anomaly", "value": 0});
                                            vm.parameterValues.push({"name": "useNewData", "value": true});
                                            vm.parameterValues.push({
                                                "name": "latitude",
                                                "value": vm.config.latitudeGPS
                                            });
                                            vm.parameterValues.push({
                                                "name": "longitude",
                                                "value": vm.config.longitudeGPS
                                            });
                                            vm.parameterValues.push({"name": "hight", "value": vm.config.hightGPS});
                                            vm.parameterValues.push({
                                                "name": "reactionMeters",
                                                "value": vm.config.reactionMetersGPS
                                            });
                                            vm.parameterValues.push({"name": "randomAngle", "value": randomAngle});
                                            vm.parameterValues.push({"name": "axis", "value": randomAxis});
                                        } else {
                                            vm.parameterValues.push({"name": "who", "value": vm.config.whoGPS});
                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.eventGPS)
                                            });
                                            vm.parameterValues.push({"name": "useNewData", "value": true});
                                            vm.parameterValues.push({
                                                "name": "latitude",
                                                "value": vm.config.latitudeGPS
                                            });
                                            vm.parameterValues.push({
                                                "name": "longitude",
                                                "value": vm.config.longitudeGPS
                                            });
                                            vm.parameterValues.push({"name": "hight", "value": vm.config.hightGPS});
                                            vm.parameterValues.push({
                                                "name": "reactionMeters",
                                                "value": vm.config.reactionMetersGPS
                                            });
                                            vm.parameterValues.push({"name": "randomAngle", "value": randomAngle});
                                            vm.parameterValues.push({"name": "axis", "value": randomAxis});
                                            vm.parameterValues.push({
                                                "name": "anomaly",
                                                "value": parseInt(vm.config.anomalyGPS)
                                            });
                                        }

                                        newTestObject.config.push(vm.parameterValues);
                                    }
                                    if (vm.selectedSensors.includes('TestingGPSSensorPl')) {
                                        vm.parameterValues = [];
                                        vm.parameterValues.push({
                                            "name": "ConfigName",
                                            "value": 'TestingGPSSensorPl'
                                        });
                                        if (vm.config.eventGPSPl === '3' || vm.config.eventGPSPl === '4' || vm.config.eventGPSPl === '5') {

                                            vm.parameterValues.push({"name": "who", "value": vm.config.whoGPSPl});
                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.eventGPSPl)
                                            });
                                            vm.parameterValues.push({"name": "anomaly", "value": 0});
                                            vm.parameterValues.push({"name": "useNewData", "value": true});
                                            vm.parameterValues.push({
                                                "name": "latitude",
                                                "value": vm.config.latitudeGPSPl
                                            });
                                            vm.parameterValues.push({
                                                "name": "longitude",
                                                "value": vm.config.longitudeGPSPl
                                            });
                                            vm.parameterValues.push({"name": "hight", "value": vm.config.hightGPSPl});
                                            vm.parameterValues.push({
                                                "name": "reactionMeters",
                                                "value": vm.config.reactionMetersGPSPl
                                            });
                                            vm.parameterValues.push({"name": "randomAngle", "value": randomAngle});
                                            vm.parameterValues.push({"name": "axis", "value": randomAxis});
                                            vm.parameterValues.push({"name": "simTime", "value": vm.config.simTime});
                                            vm.parameterValues.push({
                                                "name": "amountEvents",
                                                "value": vm.config.amountEvents
                                            });
                                            vm.parameterValues.push({
                                                "name": "amountAnomalies",
                                                "value": vm.config.amountAnomalies
                                            });
                                        } else {
                                            vm.parameterValues.push({"name": "who", "value": vm.config.whoGPSPl});
                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.eventGPSPl)
                                            });
                                            vm.parameterValues.push({"name": "useNewData", "value": true});
                                            vm.parameterValues.push({
                                                "name": "latitude",
                                                "value": vm.config.latitudeGPSPl
                                            });
                                            vm.parameterValues.push({
                                                "name": "longitude",
                                                "value": vm.config.longitudeGPSPl
                                            });
                                            vm.parameterValues.push({"name": "hight", "value": vm.config.hightGPSPl});
                                            vm.parameterValues.push({
                                                "name": "reactionMeters",
                                                "value": vm.config.reactionMetersGPSPl
                                            });
                                            vm.parameterValues.push({"name": "randomAngle", "value": randomAngle});
                                            vm.parameterValues.push({"name": "axis", "value": randomAxis});
                                            vm.parameterValues.push({
                                                "name": "anomaly",
                                                "value": parseInt(vm.config.anomalyGPSPl)
                                            });
                                            vm.parameterValues.push({"name": "simTime", "value": vm.config.simTime});
                                            vm.parameterValues.push({
                                                "name": "amountEvents",
                                                "value": vm.config.amountEvents
                                            });
                                            vm.parameterValues.push({
                                                "name": "amountAnomalies",
                                                "value": vm.config.amountAnomalies
                                            });
                                        }

                                        newTestObject.config.push(vm.parameterValues);
                                    }
                                    if (vm.selectedSensors.includes('TestingBeschleunigungsSensor')) {
                                        vm.parameterValues = [];
                                        vm.parameterValues.push({
                                            "name": "ConfigName",
                                            "value": 'TestingBeschleunigungsSensor'
                                        });
                                        if (vm.config.eventAcc === '3' || vm.config.eventAcc === '4' || vm.config.eventAcc === '5') {
                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.eventAcc)
                                            });
                                            vm.parameterValues.push({"name": "useNewData", "value": true});
                                            vm.parameterValues.push({
                                                "name": "directionAnomaly",
                                                "value": directionOutlier
                                            });
                                            vm.parameterValues.push({
                                                "name": "directionMovement",
                                                "value": directionMovement
                                            });

                                            vm.parameterValues.push({"name": "anomaly", "value": 0});
                                            vm.parameterValues.push({"name": "weightObject", "value": 0});
                                            vm.parameterValues.push({"name": "sensitivityClass", "value": 0});
                                            vm.parameterValues.push({"name": "reactionMeters", "value": 3});
                                        } else if (vm.config.event === '2') {
                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.eventAcc)
                                            });
                                            vm.parameterValues.push({
                                                "name": "anomaly",
                                                "value": parseInt(vm.config.anomalyAcc)
                                            });
                                            vm.parameterValues.push({"name": "useNewData", "value": true});
                                            vm.parameterValues.push({
                                                "name": "weightObject",
                                                "value": parseInt(vm.config.weightObjectAcc)
                                            });
                                            vm.parameterValues.push({
                                                "name": "sensitivityClass",
                                                "value": parseInt(vm.config.sensitivityAcc)
                                            });
                                            vm.parameterValues.push({
                                                "name": "reactionMeters",
                                                "value": parseInt(vm.config.reactionMetersAcc)
                                            });
                                            vm.parameterValues.push({
                                                "name": "directionAnomaly",
                                                "value": directionOutlier
                                            });
                                            vm.parameterValues.push({
                                                "name": "directionMovement",
                                                "value": directionMovement
                                            });
                                        } else if (vm.config.event === '1') {
                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.eventAcc)
                                            });
                                            vm.parameterValues.push({
                                                "name": "anomaly",
                                                "value": parseInt(vm.config.anomalyAcc)
                                            });
                                            vm.parameterValues.push({"name": "useNewData", "value": true});
                                            vm.parameterValues.push({
                                                "name": "directionAnomaly",
                                                "value": directionOutlier
                                            });
                                            vm.parameterValues.push({
                                                "name": "directionMovement",
                                                "value": directionMovement
                                            });

                                            vm.parameterValues.push({"name": "weightObject", "value": 0});
                                            vm.parameterValues.push({"name": "sensitivityClass", "value": 0});
                                            vm.parameterValues.push({"name": "reactionMeters", "value": 3});
                                        }
                                        newTestObject.config.push(vm.parameterValues);
                                    }

                                    if (vm.selectedSensors.includes('TestingBeschleunigungsSensorPl')) {
                                        vm.parameterValues = [];
                                        vm.parameterValues.push({
                                            "name": "ConfigName",
                                            "value": 'TestingBeschleunigungsSensorPl'
                                        });
                                        if (vm.config.eventAccPl === '3' || vm.config.eventAccPl === '4' || vm.config.eventAccPl === '5') {
                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.eventAccPl)
                                            });
                                            vm.parameterValues.push({"name": "useNewData", "value": true});
                                            vm.parameterValues.push({
                                                "name": "directionAnomaly",
                                                "value": directionOutlier
                                            });
                                            vm.parameterValues.push({
                                                "name": "directionMovement",
                                                "value": directionMovement
                                            });

                                            vm.parameterValues.push({"name": "anomaly", "value": 0});
                                            vm.parameterValues.push({"name": "weightObject", "value": 0});
                                            vm.parameterValues.push({"name": "sensitivityClass", "value": 0});
                                            vm.parameterValues.push({"name": "reactionMeters", "value": 3});
                                            vm.parameterValues.push({"name": "simTime", "value": vm.config.simTime});
                                            vm.parameterValues.push({
                                                "name": "amountEvents",
                                                "value": vm.config.amountEvents
                                            });
                                            vm.parameterValues.push({
                                                "name": "amountAnomalies",
                                                "value": vm.config.amountAnomalies
                                            });
                                        } else if (vm.config.event === '2') {
                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.eventAccPl)
                                            });
                                            vm.parameterValues.push({
                                                "name": "anomaly",
                                                "value": parseInt(vm.config.anomalyAccPl)
                                            });
                                            vm.parameterValues.push({"name": "useNewData", "value": true});
                                            vm.parameterValues.push({
                                                "name": "weightObject",
                                                "value": parseInt(vm.config.weightObjectAccPl)
                                            });
                                            vm.parameterValues.push({
                                                "name": "sensitivityClass",
                                                "value": parseInt(vm.config.sensitivityAccPl)
                                            });
                                            vm.parameterValues.push({
                                                "name": "reactionMeters",
                                                "value": parseInt(vm.config.reactionMetersAccPl)
                                            });
                                            vm.parameterValues.push({
                                                "name": "directionAnomaly",
                                                "value": directionOutlier
                                            });
                                            vm.parameterValues.push({
                                                "name": "directionMovement",
                                                "value": directionMovement
                                            });
                                            vm.parameterValues.push({"name": "simTime", "value": vm.config.simTime});
                                            vm.parameterValues.push({
                                                "name": "amountEvents",
                                                "value": vm.config.amountEvents
                                            });
                                            vm.parameterValues.push({
                                                "name": "amountAnomalies",
                                                "value": vm.config.amountAnomalies
                                            });
                                        } else if (vm.config.event === '1') {
                                            vm.parameterValues.push({
                                                "name": "event",
                                                "value": parseInt(vm.config.eventAccPl)
                                            });
                                            vm.parameterValues.push({
                                                "name": "anomaly",
                                                "value": parseInt(vm.config.anomalyAccPl)
                                            });
                                            vm.parameterValues.push({"name": "useNewData", "value": true});
                                            vm.parameterValues.push({
                                                "name": "directionAnomaly",
                                                "value": directionOutlier
                                            });
                                            vm.parameterValues.push({
                                                "name": "directionMovement",
                                                "value": directionMovement
                                            });

                                            vm.parameterValues.push({"name": "weightObject", "value": 0});
                                            vm.parameterValues.push({"name": "sensitivityClass", "value": 0});
                                            vm.parameterValues.push({"name": "reactionMeters", "value": 3});
                                            vm.parameterValues.push({"name": "simTime", "value": vm.config.simTime});
                                            vm.parameterValues.push({
                                                "name": "amountEvents",
                                                "value": vm.config.amountEvents
                                            });
                                            vm.parameterValues.push({
                                                "name": "amountAnomalies",
                                                "value": vm.config.amountAnomalies
                                            });
                                        }
                                        newTestObject.config.push(vm.parameterValues);
                                    }


                                }


                                for (let property in data) {
                                    if (data.hasOwnProperty(property)) {
                                        newTestObject[property] = data[property];
                                    }
                                }


                            } catch (e) {
                                vm.parameterValues = [];
                                newTestObject.type = [];
                                vm.parameterValues.push({
                                    "name": "ConfigName",
                                    "value": 'ERROR'
                                });
                                vm.parameterValues.push({
                                    "name": "event",
                                    "value": parseInt(0)
                                });
                                vm.parameterValues.push({"name": "anomaly", "value": 0});
                                vm.parameterValues.push({"name": "useNewData", "value": true});
                                newTestObject.config.push(vm.parameterValues);

                                console.log("catched error")
                            }


                            newTestObject.rules = vm.rules;
                            const radios = document.getElementsByName('executeRules');
                            let i = 0;
                            const length = radios.length;
                            for (; i < length; i++) {
                                if (radios[i].checked) {
                                    var executeRulesTemp = radios[i].value;
                                    break;
                                }
                            }

                            if (checkSimSensor == false && checkRealSensor == false) {
                                NotificationService.notify('Choose at least one sensor', 'error')
                            }


                            if (executeRulesTemp === 'undefined') {
                                NotificationService.notify('A decision must be made.', 'error')
                            }

                            vm.executeRules = executeRulesTemp === 'true';
                            newTestObject.triggerRules = vm.executeRules;
                            return addTest(newTestObject);

                        }
                    }),
                deleteTestCtrl: $controller('DeleteTestController as deleteTestCtrl', {
                    $scope: $scope,
                    deleteItem: deleteTest,
                    confirmDeletion: confirmDelete
                }),
                executeTest: executeTest,
                editConfig: editConfig,
                stopTest: stopTest,
                downloadPDF: downloadPDF,
                refreshTestEntry: refreshTestEntry,
                getDevice: getDevice,
                registerTestDevice: registerTestDevice,
                checkSensorReg: checkSensorReg,
                registerOneDimSensor: registerOneDimSensor,
                registerThreeDimSensor: registerThreeDimSensor,
                checkActuatorReg: checkActuatorReg,
                registerTestingActuator: registerTestingActuator,
                addSimulators: addSimulators,
                addRealSensor: addRealSensor

            });
            // $watch 'addTest' result and add to 'testList'
            $scope.$watch(
                function () {
                    //Value being watched
                    return vm.addTestCtrl.result;
                },
                function () {
                    //Callback
                    const test = vm.addTestCtrl.result;

                    if (test) {
                        //Close modal on success
                        $("#addTestingModal").modal('toggle');
                        //Add sensor to sensor list
                        vm.testListCtrl.pushItem(test);

                    }
                }
            );


            //Watch deletion of tests and remove them from the list
            $scope.$watch(
                function () {
                    //Value being watched
                    return vm.deleteTestCtrl.result;
                },
                function () {
                    //Callback
                    const id = vm.deleteTestCtrl.result;
                    vm.testListCtrl.removeItem(id);
                }
            );

        }
    ]);
