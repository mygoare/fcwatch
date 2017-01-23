/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

 // ASCII only
function bytesToString(buffer) {
    return String.fromCharCode.apply(null, new Uint8Array(buffer));
}

// ASCII only
function stringToBytes(string) {
    var array = new Uint8Array(string.length);
    for (var i = 0, l = string.length; i < l; i++) {
        array[i] = string.charCodeAt(i);
    }
    return array.buffer;
}

// this is RedBear Lab's UART service
var redbear = {
    serviceUUID: "713D0000-503E-4C75-BA94-3148F18D941E",
    txCharacteristic: "713D0003-503E-4C75-BA94-3148F18D941E", // transmit is from the phone's perspective
    rxCharacteristic: "713D0002-503E-4C75-BA94-3148F18D941E"  // receive is from the phone's perspective
};

var deviceId;


var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {

        var self = this;

        var onSwitchSlideEnd = function (p, v) {
            $span = this.$element.prev().find('span');
            $span.html(v);
            console.log('xxxxx onSwitchSlideEnd', v);
        };

        var offSwitchSlideEnd = function (p, v) {
            $span = this.$element.prev().find('span');
            $span.html(v);
            console.log('xxxxx offSwitchSlideEnd', v);
        };

        // on, off switches
        $('#onSwitch').rangeslider({
            step: 5,
            polyfill: false,
            onSlideEnd: onSwitchSlideEnd
        });
        $('#offSwitch').rangeslider({
            step: 5,
            polyfill: false,
            onSlideEnd: offSwitchSlideEnd
        });


        var fn = function(event) {

            var reg = /rgb\((\d+), (\d+), (\d+)\)/;
            var rgbColorArr = event.target.style.backgroundColor.match(reg);

            var color = {};
            color.red   = rgbColorArr[1];
            color.green = rgbColorArr[2];
            color.blue  = rgbColorArr[3];

            self.onSetRGB(color);
        };

        // color picker
        $('#colorPicker').on('change', fn);


        alert("Begin to scan device");
        ble.scan([], 5, app.onScanSuccess, app.onError);
    },
    onScanSuccess: function(device)
    {
        //List all the device in UI
        //more about device : https://github.com/don/cordova-plugin-ble-central
        alert("Find device");
        ble.connect(device.id, app.onConnectSuccess, app.onError);
        deviceId = device.id;
    },
    onConnectSuccess : function(){
        //Connnect success to do list
        ble.stopScan();
        alert("Connected successed");
    },
    onCreatGroup: function(menber, led_color)
    {
        //send group info to your fcwatch
        // member:
        // {
        //     member1: "1E3567123456",
        //     member2: "232146768236"
        // }
        // led_corlor
        // {
        //     red, 100,
        //     green, 20,
        //     blue, 89,
        //     on_time, 20,
        //     off_time, 100
        // }

        //send to fcwatch
    },
    onShowGroup: function(groups){
        // groups
        // {
        //     group1:{
        //         member: {
        //             member1: "1E3567123456",
        //             member2: "232146768236"            
        //         },
        //         led_color: {
        //             red: 100,
        //             green: 90,
        //             blue: 89
        //         },
        //         style: {
        //             on_window: 100,
        //             off_window: 90
        //         }
        //     }
        // }
        // display: all the group info in ui
    },
    onError: function(reason){
        alert(reason);
    },
    onSetRGB: function(color){
        console.log('test onSetRGB', color);
        // color
        // {
        //     red: 10,
        //     green, 90,
        //     blue, 10
        // }
        // send color data to fcwatch

        var data = new Uint8Array(4);
        data[0] = 0x01;
        data[1] = color.red;
        data[2] = color.green;
        data[3] = color.blue;

        ble.writeWithoutResponse(deviceId, redbear.serviceUUID, redbear.txCharacteristic, data.buffer, app.onSendSuccess, app.onError);
    },
    onSendSuccess: function(){
        
    }
};

app.initialize();