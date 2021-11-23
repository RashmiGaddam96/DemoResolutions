const errorElem = document.getElementById('error');
let receivedMediaStream = null;
let devices = [];
let deviceList = document.getElementById("devices");
let selectedCamera = [];
let tests;
let r = 0;
let camNum = 0; //used for iterating through number of camera
let scanning = false;
//Declare the MediaStreamConstraints object
const constraints = {
    audio: true,
    video: true
}

function openCamera() {
    //Ask the User for the access of the device camera and microphone
    let content = document.getElementById("videoDiv");
    content.innerHTML += `<video id='video' width="600 " height="300 " autoplay playsinline hidden>
        Sorry, video element not supported in your browsers </video>`;
    const videoElem = document.getElementById('video');
    navigator.mediaDevices.getUserMedia(constraints)
        .then(mediaStream => {
            videoElem.srcObject = mediaStream;
            receivedMediaStream = mediaStream;
            window.localStream = mediaStream;
            navigator.mediaDevices.enumerateDevices()
                .then(gotDevices)
                .catch(errorCallback);

        }).catch(err => {
            // handling the error if any
            console.log(err);
        });
}

function errorCallback(error) {
    console.log('navigator.getUserMedia error: ', error);
}

function gotDevices(deviceInfos) {
    document.getElementById('selectArea').style.visibility = "visible";
    let camcount = 1; //used for labeling if the device label is not enumerated
    for (let i = 0; i !== deviceInfos.length; ++i) {
        let deviceInfo = deviceInfos[i];
        let option = document.createElement('option');
        option.value = deviceInfo.deviceId;

        if (deviceInfo.kind === 'videoinput') {
            option.text = deviceInfo.label || 'camera ' + camcount;
            devices.push(option);
            deviceList.add(option);
            camcount++;
        }
        devices.filter((item, index) => devices.indexOf(item) !== index);

    }
    console.log(devices);
}

const closeCamera = () => {
    if (!receivedMediaStream) {
        errorElem.innerHTML = "Camera is already closed!";
        errorElem.style.display = "block";
    } else {
        /* MediaStream.getTracks() returns an array of all the 
        MediaStreamTracks being used in the received mediaStream
        we can iterate through all the mediaTracks and 
        stop all the mediaTracks by calling its stop() method*/
        receivedMediaStream.getTracks().forEach(mediaTrack => {
            mediaTrack.stop();

        });

        errorElem.innerHTML = "Camera closed successfully!"
        errorElem.style.display = "block";

        updateDiv();
    }
}


function updateDiv() {
    setTimeout(() => {
        console.log(localStream);
        localStream.getVideoTracks()[0].stop();
        let content = document.getElementById("videoDiv");
        content.srcObject = null
        var child = content.lastElementChild;
        while (child) {
            content.removeChild(child);
            child = content.lastElementChild;
        }
    }, 10);

}

function Scan(objectThis) {
    $(':button').prop('disabled', true); // Disable all the buttons
    let buttonValue = objectThis.value;
    //setup for a quick scan using the hand-built quickScan object
    if (buttonValue === "Quick Scan") {
        console.log("Quick scan");
        tests = quickScan;
    } else if (buttonValue === "Full Scan") {
        let highRes = document.getElementById("hiRes").value;

        let lowRes = document.getElementById("loRes").value;
        console.log("Full scan from " + lowRes + " to " + highRes);
        tests = createAllResolutions(parseInt(lowRes), parseInt(highRes));
    } else if (buttonValue == "PreDefinedResolutions") {
        let wid = document.getElementById("wid").value;
        let hei = document.getElementById("hei").value;
        console.log("Full scan from " + wid + " to " + hei);
        tests = definedResolutions(wid, hei);
    }
    debugger
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
                        console.log(selectedCamera[deviceCount].label + "[" + selectedCamera[deviceCount].id + "] selected");
                        deviceCount++;
                    }
                }
            }
        }

        //Make sure there is at least 1 camera selected before starting
        if (selectedCamera[0]) {
            checkResolutions(tests[r], selectedCamera[0]);
        } else {
            console.log("No camera selected. Defaulting to " + deviceList[0].text);
            selectedCamera[0] = { id: deviceList[0].value, label: deviceList[0].text };
            checkResolutions(tests[r], selectedCamera[0]);
        }
    }

    console.log(tests);

}

function displayResults() {
    var html = `<table class="table table-bordered"> `;
    for (var i = 0; i < tests.length; i++) {
        html += "<tr>";
        html += "<td>" + tests[i].label + "</td>";
        html += "<td>" + tests[i].width + "x" + tests[i].height + "</td>";
        html += "<td>" + tests[i].ratio + "</td>";
        html += "<td>" + tests[i].status + "</td>";
        html += "</tr>";
    }
    html += "</table>";
    document.getElementById("holder").innerHTML = html;
    r = 0;
    devices = [];
    $(':button').prop('disabled', false); // Enable all the buttons

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
            width: { exact: candidate.width }, //new syntax
            height: { exact: candidate.height } //new syntax
        }
    };

    setTimeout(() => {
        navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
                gotStream(stream, candidate)
            })
            .catch((error) => {
                console.log('getUserMedia error!', error);

                if (scanning) {
                    captureResults("fail: " + error.name);
                }
            });
    }, (window.stream ? 200 : 0));
}


function gotStream(mediaStream, candidate) {
    //change the video dimensions
    console.log("Display size for " + candidate.label + ": " + candidate.width + "x" + candidate.height + " Sucess");
    // video.width = candidate.width;
    // video.height = candidate.height;
    window.stream = mediaStream;
    video.srcObject = mediaStream;
    captureResults("success")
}

function captureResults(status) {
    if (!scanning) //exit if scan is not active
        return;
    tests[r].status = status;
    r++;
    //go to the next tests
    if (r < tests.length) {
        checkResolutions(tests[r], selectedCamera[camNum]);
    } else if (camNum < selectedCamera.length - 1) { //move on to the next camera
        camNum++;
        r = 0;
        checkResolutions(tests[r], selectedCamera[camNum])
    } else { //finish up
        scanning = false;
        if (devices) {
            setTimeout(() => { displayResults() }, 10)

        }
    }
}




const quickScan = [

    // {
    //     "label": "4K(UHD)",
    //     "width": 3840,
    //     "height": 2160,
    //     "ratio": "16:9"
    // },
    // {
    //     "label": "1080p(FHD)",
    //     "width": 1920,
    //     "height": 1080,
    //     "ratio": "16:9"
    // },
    // {
    //     "label": "UXGA",
    //     "width": 1600,
    //     "height": 1200,
    //     "ratio": "4:3"
    // },
    // {
    //     "label": "720p(HD)",
    //     "width": 1280,
    //     "height": 720,
    //     "ratio": "16:9"
    // },
    {
        "label": "SVGA",
        "width": 800,
        "height": 600,
        "ratio": "4:3"
    },
    {
        "label": "VGA",
        "width": 640,
        "height": 480,
        "ratio": "4:3"
    },
    {
        "label": "360p(nHD)",
        "width": 640,
        "height": 360,
        "ratio": "16:9"
    },
    {
        "label": "CIF",
        "width": 352,
        "height": 288,
        "ratio": "4:3"
    },
    {
        "label": "QVGA",
        "width": 320,
        "height": 240,
        "ratio": "4:3"
    },
    {
        "label": "QCIF",
        "width": 176,
        "height": 144,
        "ratio": "4:3"
    },
    {
        "label": "QQVGA",
        "width": 160,
        "height": 120,
        "ratio": "4:3"
    }

];

function definedResolutions(width, height) {
    let resolutions = [],
        res;

    //HD
    res = {
        "label": width + "x" + height,
        "width": width, //this was returning a string
        "height": height,
        "ratio": "16:9"
    };
    resolutions.push(res);

    //SD
    res = {
        "label": width + "x" + height,
        "width": width,
        "height": height,
        "ratio": "4:3"
    };
    resolutions.push(res);

    //square
    //noinspection JSSuspiciousNameCombination
    res = {
        "label": width + "x" + height,
        "width": width,
        "height": height,
        "ratio": "1:1"
    };
    resolutions.push(res);
    return resolutions;

}


//creates an object with all HD & SD video ratios between two heights
function createAllResolutions(minHeight, maxHeight) {
    const ratioHD = 16 / 9;
    const ratioSD = 4 / 3;

    let resolutions = [],
        res;

    for (let y = maxHeight; y >= minHeight; y--) {
        //HD
        res = {
            "label": (y * ratioHD).toFixed() + "x" + y,
            "width": parseInt((y * ratioHD).toFixed()), //this was returning a string
            "height": y,
            "ratio": "16:9"
        };
        resolutions.push(res);

        //SD
        res = {
            "label": (y * ratioSD).toFixed() + "x" + y,
            "width": parseInt((y * ratioSD).toFixed()),
            "height": y,
            "ratio": "4:3"
        };
        resolutions.push(res);

        //square
        //noinspection JSSuspiciousNameCombination
        res = {
            "label": y + "x" + y,
            "width": y,
            "height": y,
            "ratio": "1:1"
        };
        resolutions.push(res);

    }
    console.log("resolutions length: " + resolutions.length);
    return resolutions;
}