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

function hexToRgbA(hex){
    var c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+',1)';
    }
    throw new Error('Bad Hex');
}

var colorTables = [
    {
        name: '红色',
        hex: '#c4272d'
    },
    {
        name: '绿色',
        hex: '#93EAA3'
    },
    {
        name: '蓝色',
        hex: '#227eaf'
    },
    {
        name: '橙色',
        hex: '#f6bd1f'
    },
    {
        name: '黄色',
        hex: '#f8ef98'
    },
    {
        name: '紫色',
        hex: '#8b80ff'
    }
];


// this is RedBear Lab's UART service
var redbear = {
    serviceUUID: "713D0000-503E-4C75-BA94-3148F18D941E",
    txCharacteristic: "713D0003-503E-4C75-BA94-3148F18D941E", // transmit is from the phone's perspective
    rxCharacteristic: "713D0002-503E-4C75-BA94-3148F18D941E" // receive is from the phone's perspective
};

var fc = {};
var $$ = Dom7;
var myApp = new Framework7();

// start app
var startApp = function() {
    var self = this;



    var mainView = myApp.addView('.view-main', {
        dynamicNavbar: true
    });

    fc.mainView = mainView;


    myApp.onPageInit('scan-devices-list', function(page){
        console.log('xxxxxxxx', 'scan-devices-list initialized', page);

        // insert li.swipe-out lists template
        // fill with devices data

        var devicesCount = page.query.devicesCount;
        var devicesData  = page.query.devicesData;

        var listHtml = '<ul>';

        for (var i = 0; i < devicesCount; i++) {
            var liHtml =
                '<li class="swipeout">' +
                    '<div class="swipeout-content item-content">' +
                    '<div class="item-inner">' +
                    '<div class="item-title-row">' +
                    '<div class="item-title">' +
                    devicesData[i].name +
                    '</div>' +
                    '</div>' +
                    '<div class="item-subtitle">' +
                    devicesData[i].id +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '<div class="swipeout-actions-right">' +
                    '<a href="#" class="setting-action bg-orange">' +
                    '设置' +
                    '</a>' +
                    '</div>' +
                '</li>';
            listHtml += liHtml
        }

        listHtml += '</ul>';

        $$(page.container).find('.list-block.media-list').append(listHtml);

        $$('.setting-action').on('click', function(event){
            /*
            1. connect the device
            2. do settings (color, blink)
             */

            //var deviceId;
            //self.onConnectDevice(deviceId, self.onSetColorAndBlink, self.onError);
            self.onSetColorAndBlink();

        });
        $$('.group-action').on('click', function(event){
            /*
            1. connect the device
            2. do grouping
             */

            var deviceId;
            self.onConnectDevice(deviceId, self.onCreateGroup(), self.onError);
        });
    });

    myApp.onPageInit('set-color-and-blink', function(){

        var values = colorTables.map(function(val, i){return val.hex});
        var displayValues = colorTables.map(function(val, i){return val.name});

        var colorPicker = myApp.picker({
            input: '#color-picker-input',
            cols: [
                {
                    textAlign: 'center',
                    values:         values,
                    displayValues:  displayValues
                }
            ]
        });

        $$('.cancelColorBlinkBtn').on('click', function(){
            // go back
            fc.mainView.router.back();
        });

        $$('.setColorBlinkBtn').on('click', function(){
            // set color and blink, trigger oncolorAndBlinkPicked event

            // 1. get data

            // {
            //     red: 100,
            //     green: 200,
            //     blue: 30,
            //     on: 1, //1 unit = 0.1s
            //     off: 1
            // }

            var colorHex;
            var onDuration, offDuration;

            colorHex =    $$('#color-picker-input').val();
            onDuration =  $$('#blink-on-input').val();
            offDuration = $$('#blink-off-input').val();


            var colorRGBA = hexToRgbA(colorHex);
            var o = {};

            var reg = /rgba\((\d+),(\d+),(\d+),1\)/;
            var colorRGBArr = colorRGBA.match(reg);

            o['red'] = parseInt(colorRGBArr[1]);
            o['green'] = parseInt(colorRGBArr[2]);
            o['blue'] = parseInt(colorRGBArr[3]);
            o['on'] = parseInt(onDuration);
            o['off'] = parseInt(offDuration);



            console.log('xxxxxxxx', o);
            //self.oncolorAndBlinkPicked(o);


            // go back (模拟，需要回调)
            fc.mainView.router.back();
        });
    });

    var bindScanBtn = function(){
        // 扫描蓝牙手环
        $('#scanBtn').on('click', self.onBeginToScan);

    };


    myApp.onPageInit('scan', bindScanBtn);

    bindScanBtn();

};

var app = {
    /***************************** app local data ***********************************/
    localData: {
        myDeviceID: 0
    },
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },
    /***************************** EventCallBacks ***********************************/
    // deviceready Event Handler
    onDeviceReady: function() {


        startApp.call(this);


    },
    //on scan button clicked
    onBeginToScan: function() 
    {
        //ble.scan([], 5, app.onFindDevice, app.onError);
        myApp.showPreloader('查找设备中...');

        setTimeout(function(){
            myApp.hidePreloader();
            app.onFindDevice();
        }, 1000);
    },
    //on find a device, add the device to device list UI
    onFindDevice: function(devices) {

        // sample devices data
        var devices = [
            {
                name: 'Goare',
                id: '123456789'
            },
            {
                name: 'GGGGGOOOO',
                id: '0987654321'
            }
        ];

        // should be array of devices
        console.log('xxxxxxxx', "scan devices list html");

        // render with devices data, it is an array
        fc.mainView.router.load({
            url: 'scan-devices-list.html',
            query: {
                devicesCount: devices.length,
                devicesData : devices
            }
        });

        //device is json like data structure ex:
        // {
        //     "name": "TI SensorTag",
        //     "id": "BD922605-1B07-4D55-8D09-B66653E51BBA",
        //     "rssi": -79,
        //     "advertising": /* ArrayBuffer or map */
        // }
        //add it to a list, waitting for being clicked

        // show a list of devices view here
        // click one of them, then trigger onConnectDevice event
    },
    onConnectDevice: function(id, onSuccess, onError)
    {
        app.localData.myDeviceID = id;
        ble.connect(id, onSuccess, onError);
    },
    //onConnectSuccess: function()
    //{
    //
    //    // two options:
    //    // one is set the color and the time of on/off
    //    // another is set group, hold
    //
    //    //tell user connected;
    //    //show create a group or set color and blink time windows
    //},

    onSetColorAndBlink: function()
    {
        //open color and blink set panel

        fc.mainView.router.loadPage('set-color-and-blink.html');


    },
    oncolorAndBlinkPicked: function(data)
    {
        console.log('xxxxxxxx', data);
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

    onCreateGroup: function()
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
        // {
        //     "name": "TI SensorTag",
        //     "id": "BD922605-1B07-4D55-8D09-B66653E51BBA",
        //     "rssi": -79,
        //     "advertising": /* ArrayBuffer or map */
        // }
        //list the devices by side

        // 调用 onStopScan
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