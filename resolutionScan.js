const errorElem = document.getElementById('error'); // for testing errors in mobile
let receivedMediaStream = null;
let devices = [];
let deviceList = document.getElementById("devices");
let selectedCamera = [];
let resultsList;
let r = 0;
let camNum = 0; //used for iterating through number of camera
let scanning = false;
//Declare the MediaStreamConstraints object
const constraints = {
    audio: false,
    video: true
}
document.onload = openCamera();

function openCamera() {
    // //Ask the User for the access of the device camera and microphone
    videoStream(true);
}

function videoStream(check) {
    let content = document.getElementById("videoDiv");
    content.innerHTML += `<video id='video' width='600' height='300' autoplay playsinline hidden> </video>`;
    let videoElem = document.getElementById('video');
    navigator.mediaDevices.getUserMedia(constraints)
        .then(mediaStream => {
            videoElem.srcObject = mediaStream;
            receivedMediaStream = mediaStream;
            window.localStream = mediaStream;
            if (check) {
                navigator.mediaDevices.enumerateDevices()
                    .then(cameraDevicesList)
                    .catch(errorCallback);
                closeCamera();
            }
        }).catch(err => {
            // handling the error if any
            errorElem.innerHTML += 'Err:' + JSON.stringify(err);
        });
}

function errorCallback(error) {
    errorElem.innerHTML += 'Error:: ' + JSON.stringify(error);
}

function cameraDevicesList(devicesInfo) {
    document.getElementById('selectArea').style.visibility = "visible";
    let camcount = 1; //used for labeling if the device label is not enumerated
    for (let i = 0; i !== devicesInfo.length; ++i) {
        let deviceInfo = devicesInfo[i];
        let option = document.createElement('option');
        option.value = deviceInfo.deviceId;

        if (deviceInfo.kind === 'videoinput') {
            option.text = deviceInfo.label || 'camera ' + camcount;
            devices.push(option);
            deviceList.add(option);
            camcount++;
        }
    }
}

const closeCamera = () => {
    let content = document.getElementById('videoDiv');

    if (receivedMediaStream) {
        /* MediaStream.getTracks() returns an array of all the 
        MediaStreamTracks being used in the received mediaStream
        we can iterate through all the mediaTracks and 
        stop all the mediaTracks by calling its stop() method*/
        receivedMediaStream.getTracks().forEach(mediaTrack => {
            mediaTrack.stop();

        });
    }
    setTimeout(() => {
        localStream.getVideoTracks()[0].stop();
        let video = document.getElementById('video');
        video.src = '';
        video.srcObject = null
        let length = content.children.length;
        for (let i = 0; i < length; i++) {
            let child = content.lastElementChild;
            content.removeChild(child);
        }
    }, 10);
}



function Scan(objectThis) {
    $('#cover-spin').show(0);
    $(':button').prop('disabled', true); // Disable all the buttons
    videoStream(false);
    let buttonValue = objectThis.value;
    if (buttonValue === "Quick Scan") {
        console.log("Quick scan");
        resultsList = resolutionsData;

    } else if (buttonValue == "PreDefinedResolutions") {
        let wid = document.getElementById("wid").value;
        let hei = document.getElementById("hei").value;
        resultsList = definedResolutions(wid, hei);
    }
    //setup for a quick scan using the hand-built quickScan object
    scanning = true;

    if (devices) {
        //run through the deviceList to see what is selected
        for (let deviceCount = 0, d = 0; d < deviceList.length; d++) {
            if (deviceList[d].selected) {
                //if it is selected, check the label against the getSources array to select the proper ID
                for (let z = 0; z < devices.length; z++) {
                    if (devices[z].value === deviceList[d].value) {
                        //just pass along the id and label
                        let camera = {};
                        camera.id = devices[z].value;
                        camera.label = devices[z].text;
                        selectedCamera[deviceCount] = camera;
                        errorElem.innerHTML += 'selectedCamera::' + selectedCamera[deviceCount].id;
                        errorElem.innerHTML += 'selectedCamera::' + selectedCamera[deviceCount].label;

                        deviceCount++;
                    }
                }
            }
        }
        //Make sure there is at least 1 camera selected before starting
        if (selectedCamera[0]) {
            checkResolutions(resultsList[r], selectedCamera[0]);
        } else {
            selectedCamera[0] = { id: deviceList[0].value, label: deviceList[0].text };
            checkResolutions(resultsList[r], selectedCamera[0]);
        }
    }
}



function checkResolutions(candidate, device) {
    //Kill any running streams;
    if (window.stream) {
        stream.getTracks().forEach((track) => {
            track.stop();
        });
    }

    //create constraints object
    let constraints = {
        audio: false,
        video: {
            deviceId: device.id ? { exact: device.id } : undefined,
            width: { min: candidate.width },
            height: { min: candidate.height },
            facingMode: 'user'
        }
    };

    setTimeout(() => {
        navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
                gotStream(stream, candidate)
            })
            .catch((error) => {
                errorElem.innerHTML += 'ErrorGetUderMediaError::' + JSON.stringify(error);
                if (scanning) {
                    errorElem.innerHTML += 'ErrorFail::' + error;
                    captureResults('Fail: ' + error.name);
                }
            });
    }, (window.stream ? 200 : 0));
}


function gotStream(mediaStream, candidate) {
    //change the video dimensions
    window.stream = mediaStream;
    video.srcObject = mediaStream;
    captureResults('Success')
}

function captureResults(status) {
    if (!scanning) //exit if scan is not active
        return;
    resultsList[r].status = status;
    r++;
    //go to the next resultsList
    if (r < resultsList.length) {
        checkResolutions(resultsList[r], selectedCamera[camNum]);
    } else if (camNum < selectedCamera.length - 1) { //move on to the next camera if existed
        camNum++;
        r = 0;
        checkResolutions(resultsList[r], selectedCamera[camNum])
    } else { //finish up
        scanning = false;
        if (devices) {
            setTimeout(() => {
                displayResults();
            }, 10)
        }
    }
}

function displayResults() {
    var results = resultsList;
    let text = "<h4> Selected Camera :" + selectedCamera[camNum].label + "</h4>";;
    var html = text + ` <table class = 'table table-bordered m-2' > <tr> <th> Label </th><th>Width x Height</th> <th> Ratio </th><th>Status</th> </tr>`;
    for (var i = 0; i < results.length; i++) {
        html += "<tr>";
        html += "<td>" + results[i].label + "</td>";
        html += "<td>" + results[i].width + " x " + results[i].height + "</td>";
        html += "<td>" + results[i].ratio + "</td>";
        html += "<td>" + results[i].status + "</td>";
        html += "</tr>";
    }
    html += `</table>`;
    document.getElementById("results").innerHTML = html;
    r = 0;
    $(':button').prop('disabled', false); // Enable all the buttons
    closeCamera();
    $('#cover-spin').hide();
}

function definedResolutions(width, height) {
    let resolutions = [],
        res;

    res = {
        "label": width + "x" + height,
        "width": width, //this was returning a string
        "height": height,
        "ratio": ""
    };
    resolutions.push(res);
    return resolutions;
}



const resolutionsData = [

    {
        "label": "QQVGA",
        "width": 160,
        "height": 120,
        "ratio": "4:3"
    },
    {
        "label": "QCIF",
        "width": 176,
        "height": 120,
        "ratio": ""
    },
    {
        "label": "QCIF",
        "width": 176,
        "height": 144,
        "ratio": "4:3"
    },
    {
        "label": "QCIF",
        "width": 192,
        "height": 144,
        "ratio": ""
    },
    {
        "label": "HQVGA",
        "width": 240,
        "height": 160,
        "ratio": ""
    },
    {
        "label": "QVGA",
        "width": 320,
        "height": 240,
        "ratio": "4:3"
    },
    {
        "label": "CIF/CD NTSC",
        "width": 352,
        "height": 240,
        "ratio": ""
    },
    {
        "label": "CIF/CD PAL",
        "width": 352,
        "height": 288,
        "ratio": "4:3"
    },
    {
        "label": "xCIF",
        "width": 384,
        "height": 288,
        "ratio": ""
    },
    {
        "label": "360p",
        "width": 480,
        "height": 360,
        "ratio": ""
    },
    {
        "label": "360p(nHD)",
        "width": 640,
        "height": 360,
        "ratio": "16:9"
    },
    {
        "label": "SD(480p)/VGA(0.3p)",
        "width": 640,
        "height": 480,
        "ratio": "4:3"
    },
    {
        "label": "2CIF",
        "width": 704,
        "height": 240,
        "ratio": ""
    },
    {
        "label": "4CIF",
        "width": 704,
        "height": 480,
        "ratio": ""
    },
    {
        "label": "DVD NT SC/d1",
        "width": 720,
        "height": 480,
        "ratio": ""
    },
    {
        "label": "SVGA",
        "width": 800,
        "height": 600,
        "ratio": "4:3"
    },
    {
        "label": "WGA",
        "width": 800,
        "height": 480,
        "ratio": ""
    },
    {
        "label": "DVCPRO HD",
        "width": 960,
        "height": 720,
        "ratio": ""
    },
    {
        "label": "XGA ",
        "width": 1024,
        "height": 768,
        "ratio": "4:3"
    },
    {
        "label": "WXGA",
        "width": 1152,
        "height": 768,
        "ratio": "3:2"
    },
    {
        "label": "XGA+",
        "width": 1152,
        "height": 864,
        "ratio": "4:3"
    },
    {
        "label": "720p(HD)/1MP",
        "width": 1280,
        "height": 720,
        "ratio": "16:9"
    },
    {
        "label": "WXGA",
        "width": 1280,
        "height": 800,
        "ratio": ""
    },
    {
        "label": "SXGA−",
        "width": 1280,
        "height": 960,
        "ratio": ""
    },
    {
        "label": "SXGA",
        "width": 1280,
        "height": 1024,
        "ratio": ""
    },
    {
        "label": "WXGA",
        "width": 1280,
        "height": 768,
        "ratio": "5:3"
    },
    {
        "label": "WXGA",
        "width": 1360,
        "height": 768,
        "ratio": "16:9"
    },
    {
        "label": "FWXGA",
        "width": 1366,
        "height": 768,
        "ratio": "16:9"
    },
    {
        "label": "SXGA+",
        "width": 1400,
        "height": 1050,
        "ratio": "4:3"
    },
    {
        "label": "WXGA+",
        "width": 1440,
        "height": 900,
        "ratio": "16:1"
    },
    {
        "label": "WSXGA",
        "width": 1440,
        "height": 960,
        "ratio": "3:2"
    },
    {
        "label": "1080P 4:3",
        "width": 1440,
        "height": 1080,
        "ratio": "4:3"
    },
    {
        "label": "UXGA",
        "width": 1600,
        "height": 1200,
        "ratio": "4:3"
    },
    {
        "label": "WSXGA+",
        "width": 1680,
        "height": 1050,
        "ratio": "16:1"
    },
    {
        "label": "1080p(FHD)/2MP",
        "width": 1920,
        "height": 1080,
        "ratio": "16:9"
    },
    {
        "label": "WUXGA",
        "width": 1920,
        "height": 1200,
        "ratio": "16:1"
    },
    {
        "label": "QXGA(3MP 4:3)",
        "width": 2048,
        "height": 1536,
        "ratio": "4:3"
    },
    {
        "label": "2.5K",
        "width": 2432,
        "height": 1366,
        "ratio": ""
    },
    {
        "label": "2K",
        "width": 2048,
        "height": 1152,
        "ratio": "1:1.77"
    },
    {
        "label": "FHD+(mobile)",
        "width": 2160,
        "height": 1080,
        "ratio": "18:9"
    },
    {
        "label": "3MP 16:9",
        "width": 2304,
        "height": 1296,
        "ratio": "16:9"
    },
    {
        "label": "FHD+ (mobile)",
        "width": 2400,
        "height": 1080,
        "ratio": "40:1"
    },
    {
        "label": "QSXGA",
        "width": 2560,
        "height": 2048,
        "ratio": ""
    },
    {
        "label": "5MP 4:3",
        "width": 2562,
        "height": 1944,
        "ratio": "4:3"
    },
    {
        "label": "5MP",
        "width": 2576,
        "height": 1932,
        "ratio": ""
    },
    {
        "label": "4MP",
        "width": 2688,
        "height": 1520,
        "ratio": ""
    },
    {
        "label": "5MP 16:9",
        "width": 3072,
        "height": 1728,
        "ratio": "16:9"
    },
    {
        "label": "6MP",
        "width": 3072,
        "height": 2048,
        "ratio": ""
    },
    {
        "label": "7MP",
        "width": 3088,
        "height": 2320,
        "ratio": ""
    },
    {
        "label": "QUXGA",
        "width": 3200,
        "height": 2400,
        "ratio": ""
    },
    {
        "label": "8MP",
        "width": 3264,
        "height": 2448,
        "ratio": ""
    },
    {
        "label": "4K(UHD)/8MP/2160p",
        "width": 3840,
        "height": 2160,
        "ratio": "16:9"
    },
    {
        "label": "12MP",
        "width": 4000,
        "height": 3000,
        "ratio": ""
    },
    {
        "label": "12MP",
        "width": 4032,
        "height": 3024,
        "ratio": ""
    },
    {
        "label": "DCI 4K",
        "width": 4096,
        "height": 2160,
        "ratio": ""
    },
    {
        "label": "HXGA",
        "width": 4096,
        "height": 3072,
        "ratio": ""
    },
    {
        "label": "UW5K",
        "width": 5120,
        "height": 2160,
        "ratio": ""
    },
    {
        "label": "5K",
        "width": 5120,
        "height": 2880,
        "ratio": "1:1.85"
    },
    {
        "label": "WHXGA",
        "width": 5120,
        "height": 3200,
        "ratio": ""
    },
    {
        "label": "HSXGA",
        "width": 5120,
        "height": 4096,
        "ratio": ""
    },
    {
        "label": "WHSXGA",
        "width": 6400,
        "height": 4096,
        "ratio": ""
    },
    {
        "label": "HUXGA",
        "width": 6400,
        "height": 4800,
        "ratio": ""
    },
    {
        "label": "8K UHD",
        "width": 7680,
        "height": 4320,
        "ratio": ""
    },
    {
        "label": "WHUXGA",
        "width": 7680,
        "height": 4800,
        "ratio": ""
    },
    {
        "label": "UW10K",
        "width": 10240,
        "height": 4320,
        "ratio": ""
    }
];