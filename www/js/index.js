/*

程序运行流程说明:
deviceready事件触；
开始监听『扫描』按键按下事件；
在『扫描』按键的按下事件中开始蓝牙手环的扫描，绑定扫描成功回掉函数；
给出设备列表，绑定item点击事件；
连接点击的蓝牙手环，绑定连接成功事件；
打开组群、调色选择界面；
如果进入调色就直接打开调色面板（调色调的的没有发现任何群友的情况自己默认的反应，有颜色和亮灭时间）；
点击组群后发出获取当前组群信息界面（每个群都有对应的颜色和亮灭时间）;
一旦获取到蓝牙手环的群信息之后应该调用ble.disconnect方法，因为只有断开蓝牙之后手机才能发现周边的手环发出的广播信息，以便获取组群之前周边的手环列表；
将组群信息保存，组群完毕之后一次性发送给蓝牙手环，但是发送之前应该先连接上蓝牙手环；

关于ble API的操作 参见：https://github.com/don/cordova-plugin-ble-central#connect

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
    rxCharacteristic: "713D0002-503E-4C75-BA94-3148F18D941E" // receive is from the phone's perspective
};

var app = {
    /***************************** app local data ***********************************/
    localData: {
        myDeviceID: 0
    }
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },
    /***************************** EventCallBacks ***********************************/
    // deviceready Event Handler
    onDeviceReady: function() {

        var self = this;

        var onSwitchSlideEnd = function(p, v) {
            $span = this.$element.prev().find('span');
            $span.html(v);
            console.log('xxxxx onSwitchSlideEnd', v);
        };

        var offSwitchSlideEnd = function(p, v) {
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
            color.red = rgbColorArr[1];
            color.green = rgbColorArr[2];
            color.blue = rgbColorArr[3];

            self.oncolorAndBlinkPicked(color);
        };

        // color picker
        $('#colorPicker').on('change', fn);
    },
    //on scan button clicked
    onBeginToScan: function() 
    {
        ble.scan([], 5, app.onFindDevice, app.onError);
    },
    //on find a device, add the device to device list UI
    onFindDevice: function(device) {
        //device is json like data structure ex:
        // {
        //     "name": "TI SensorTag",
        //     "id": "BD922605-1B07-4D55-8D09-B66653E51BBA",
        //     "rssi": -79,
        //     "advertising": /* ArrayBuffer or map */
        // }
        //add it to a list, waitting for being clicked
    },
    onConnectDevice: function(id)
    {
        app.localData.myDeviceID = id;
        ble.connect(id, app.onConnectSuccess, app.onError);
    },
    onConnectSuccess: function()
    {
        //tell user connected;
        //show create a group or set color and blink time windows
    },
    onSetColorAndBlink: function()
    {
        //open color and blink set pannel
    },
    oncolorAndBlinkPicked: function(data)
    {
        // data:
        // {
        //     red: 100,
        //     green: 200,
        //     blue: 30,
        //     on: 1, //1 unit = 0.1s
        //     off: 1
        // }
        //send data to device
        // var data = new Uint8Array(6);
        // data[0] = 0x01;
        // data[1] = data.red;
        // data[2] = data.green;
        // data[3] = data.blue;
        // data[4] = data.on;
        // data[5] = data.off;

        // ble.writeWithoutResponse(deviceId, redbear.serviceUUID, redbear.txCharacteristic, data.buffer, app.onSendSuccess, app.onError);

    },
    onCreatGroup: function() 
    {
        //获取当前组群信息中 UI 等待
        var groupInfo = app.getDeviceGroupInfo();
        //groupInfo
        // {
        //     group1: {
        //         members: {
        //             member1: "1E3567123456",
        //             member2: "1E3567123456",
        //             member3: "1E3567123456"
        //         },
        //         action: {
        //             red: 90,
        //             green: 100,
        //             blue: 90,
        //             on: 10, //1 unit = 0.1s
        //             off: 8
        //         }
        //     },
        //     group2: {
        //         members: {
        //             member1: "1E3567123456",
        //             member2: "1E3567123456",
        //             member3: "1E3567123456"
        //         },
        //         action: {
        //             red: 90,
        //             green: 100,
        //             blue: 90,
        //             on: 10, //1 unit = 0.1s
        //             off: 8
        //         }
        //     },
        //     group3: {
        //         members: {
        //             member1: "1E3567123456",
        //             member2: "1E3567123456",
        //             member3: "1E3567123456"
        //         },
        //         action: {
        //             red: 90,
        //             green: 100,
        //             blue: 90,
        //             on: 10, //1 unit = 0.1s
        //             off: 8
        //         }
        //     },
        // }
        // disconnect from your fc watch
        ble.disconnect(app.localData.myDeviceID);
        ble.ble.startScan([], app.onScanGroupMembersSuccess, app.onError);
    },
    onScanGroupMembersSuccess: function(device)
    {
        //list the devices by side
    },
    onStopScan: function()
    {   
        ble.stopScan(function(){
            console.log("scan stopped");
        }, app.onError)
    },
    onSendGroupInfoToDevice: function(group)
    {  
        //send device to fc watch
    },
    onError: function(reason) {
        console.log(reason);
    },
    /***************************** methods ***********************************/
    getDeviceGroupInfo: function()
    {
        //get group infor
        var groupInfo;
        return groupInfo;
    }
};

app.initialize();