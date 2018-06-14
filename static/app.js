"use strict";

window.jQuery || document.write('<script src="./jquery.js">\x3C/script>')
$('#upload-file-btn').click(function () {
    $('.myprogress').css('width', '0');
    $('.msg').text('');
    var myfile = $('#videoFile').val();
    var formData = new FormData();
    formData.append('myfile', $('#videoFile')[0].files[0]);
    $('#upload-file-btn').attr('disabled', 'disabled');
    $('.msg').text('Uploading in progress...');
    var form_data = new FormData($('#upload-file')[0]);


    $.ajax({
        xhr: function () {
            var xhr = new window.XMLHttpRequest();
            xhr.upload.addEventListener("progress", function (evt) {
                if (evt.lengthComputable) {
                    var percentComplete = evt.loaded / evt.total;
                    percentComplete = parseInt(percentComplete * 100);
                    $('.myprogress').text(percentComplete - 1 + '%');
                    $('.myprogress').css('width', percentComplete - 1 + '%');
                }
            }, false);
            return xhr;
        },
        type: 'POST',
        url: 'http://127.0.0.1:5000/uploadajax',
        data: form_data,
        contentType: false,
        crossDomain: true,
        cache: false,
        processData: false,
        success: function (response) {
            $('.myprogress').text(100 + '%');
            $('.myprogress').css('width', 100 + '%');
            $('.msg').text("Successfully Uploaded");
            console.log(response['fps'])
            real_fps = response['fps']
            config.fps = real_fps
            //alert(config.fps)
            file_name = response['ZIP'].slice(0, -4)
            zip_path = "http://127.0.0.1:5000/static/uploads/" + response['ZIP']
            extractionFileUploaded()
            console.log('Success!' + zip_path);
        },
    });
});

let config = {

    fps: null,

    // Low rate decreases the chance of losing frames with poor browser performances
    playbackRate: 0.0,

    // Format of the extracted frames
    imageMimeType: 'image/jpeg',
    imageExtension: '.jpg',

    // Name of the extracted frames zip archive
    framesZipFilename: 'extracted-frames.zip'
};

let real_fps = 0;
let zip_path = "";
let file_name = "";
let doodle = document.querySelector('#doodle');
let canvas = document.querySelector('#canvas');
let ctx = canvas.getContext('2d');
let videoFile = document.querySelector('#videoFile');
let zipFile = document.querySelector('#zipFile');
let xmlFile = document.querySelector('#xmlFile');
let videoDimensionsElement = document.querySelector('#videoDimensions');
let extractionProgressElement = document.querySelector('#extractionProgress');
let downloadFramesButton = document.querySelector('#downloadFrames');
let playButton = document.querySelector('#play');
let pauseButton = document.querySelector('#pause');
let speedInput = document.querySelector('#speed');
let sliderElement = document.querySelector('#slider');
let generateXmlButton = document.querySelector('#generateXml');
let framesManager = new FramesManager();
let annotatedObjectsTracker = new AnnotatedObjectsTracker(framesManager);
var fr_num;


let slider = {
    init: function (min, max, onChange) {
        $(sliderElement).slider('option', 'min', min);
        $(sliderElement).slider('option', 'max', max);
        $(sliderElement).on('slidestop', (e, ui) => {
            onChange(ui.value);
        });
        $(sliderElement).slider('enable');
    },
    setPosition: function (frameNumber) {
        $(sliderElement).slider('option', 'value', frameNumber);
    },
    reset: function () {
        $(sliderElement).slider({ disabled: true });
    }
};
slider.reset();

let player = {
    currentFrame: 0,
    isPlaying: false,
    isReady: false,
    timeout: null,

    initialize: function () {
        this.currentFrame = 0;
        this.isPlaying = false;
        this.isReady = false;

        playButton.disabled = true;
        playButton.style.display = 'block';
        pauseButton.disabled = true;
        pauseButton.style.display = 'none';
    },

    ready: function () {
        this.isReady = true;

        playButton.disabled = false;
    },

    seek: function (frameNumber) {
        if (!this.isReady) {
            return;
        }

        this.pause();

        if (frameNumber >= 0 && frameNumber < framesManager.frames.totalFrames()) {
            this.drawFrame(frameNumber);
            this.currentFrame = frameNumber;
        }
    },

    play: function () {
        if (!this.isReady) {
            return;
        }

        this.isPlaying = true;
        playButton.disabled = true;
        playButton.style.display = 'none';
        pauseButton.disabled = false;
        pauseButton.style.display = 'block';
        this.nextFrame();
    },

    pause: function () {
        if (!this.isReady) {
            return;
        }

        this.isPlaying = false;
        if (this.timeout != null) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        pauseButton.disabled = true;
        pauseButton.style.display = 'none';
        playButton.disabled = false;
        playButton.style.display = 'block';
    },

    toogle: function () {
        if (!this.isPlaying) {
            this.play();
        } else {
            this.pause();
        }
    },

    nextFrame: function () {

        if (!this.isPlaying) {
            return;
        }

        if (this.currentFrame >= framesManager.frames.totalFrames()) {
            this.done();
            return;
        }

        this.drawFrame(this.currentFrame).then(() => {
            this.currentFrame++;
            this.timeout = setTimeout(() => this.nextFrame(), 1000 / (config.fps * parseFloat(speedInput.value)));
        });
    },

    drawFrame: function (frameNumber) {
        let saving = false;
        return new Promise((resolve, _) => {
            annotatedObjectsTracker.getFrameWithObjects(frameNumber).then((frameWithObjects) => {

                ctx.drawImage(frameWithObjects.img, 0, 0);
                
                for (let i = 0; i < frameWithObjects.objects.length; i++) {
                    let object = frameWithObjects.objects[i];
                    let annotatedObject = object.annotatedObject;
                    let annotatedFrame = object.annotatedFrame;

                    if (annotatedFrame.isVisible()) {
                        annotatedObject.dom.style.display = 'block';
                        annotatedObject.dom.style.width = annotatedFrame.bbox.width + 'px';
                        annotatedObject.dom.style.height = annotatedFrame.bbox.height + 'px';
                        annotatedObject.dom.style.left = annotatedFrame.bbox.x + 'px';
                        annotatedObject.dom.style.top = annotatedFrame.bbox.y + 'px';
                        annotatedObject.dom.id = annotatedObject['name'];

                        if (typeof(map_frame.get([frameNumber, annotatedObject.name])) === 'undefined' && typeof(map_frame.get([frameNumber-1, annotatedObject.name])) === 'undefined'){
                            //set value to NA
                            $(annotatedObject.controls.find('#expID').val("NA"));
                        }else if (typeof(map_frame.get([frameNumber, annotatedObject.name])) === 'undefined' && typeof(map_frame.get([frameNumber-1, annotatedObject.name])) !== 'undefined'){
                            //set it's previous value and save info to hashmap
                            $(annotatedObject.controls.find('#expID').val(map_frame.get([frameNumber-1, annotatedObject.name])));
                            newExpression(frameNumber, annotatedObject.name, map_frame.get([frameNumber-1, annotatedObject.name]))
                        }else{
                            //set what ever existing in the hashamp
                            $(annotatedObject.controls.find('#expID').val(map_frame.get([frameNumber, annotatedObject.name])));
                        }

                        fr_num = frameNumber;
                        $(annotatedObject.controls.find('#expID')).on('change', function() {
                            if(fr_num == frameNumber){
                                //set value for the hashmap
                                newExpression(frameNumber, annotatedObject.name, $(this).val());
                            }
                        });

                        annotatedObject.visible.prop('checked', true);
                        $('#' + annotatedObject['name'] + " " + ".floating-name").text(annotatedObject['name']);

                        
                    } else {
                        annotatedObject.dom.style.display = 'none';
                        annotatedObject.visible.prop('checked', false);
                        //this will automatically sets NA for not visible faces
                        $(annotatedObject.controls.find('#expID').val('NA'));

                    }
                }

                let shouldHideOthers = frameWithObjects.objects.some(o => o.annotatedObject.hideOthers);
                if (shouldHideOthers) {
                    for (let i = 0; i < frameWithObjects.objects.length; i++) {
                        let object = frameWithObjects.objects[i];
                        let annotatedObject = object.annotatedObject;
                        if (!annotatedObject.hideOthers) {
                            annotatedObject.dom.style.display = 'none';
                        }
                    }
                }
                slider.setPosition(this.currentFrame);
                resolve();
            });
        });
    },

    done: function () {
        this.currentFrame = 0;
        this.isPlaying = false;

        playButton.disabled = false;
        playButton.style.display = 'block';
        pauseButton.disabled = true;
        pauseButton.style.display = 'none';
    }
};

const map_frame = new MultiKeyMap();

function newExpression(fnum, fname, expr) {
    map_frame.set([fnum, fname], expr);
}


function clearAllAnnotatedObjects() {
    for (let i = 0; i < annotatedObjectsTracker.annotatedObjects.length; i++) {
        clearAnnotatedObject(i);
    }
}

function clearAnnotatedObject(i) {
    let annotatedObject = annotatedObjectsTracker.annotatedObjects[i];
    annotatedObject.controls.remove();
    $(annotatedObject.dom).remove();
    annotatedObjectsTracker.annotatedObjects.splice(i, 1);
}
xmlFile.addEventListener('change', importXml, false);
playButton.addEventListener('click', playClicked, false);
pauseButton.addEventListener('click', pauseClicked, false);
generateXmlButton.addEventListener('click', generateXml, false);

function playClicked() {
    player.play();
}

function pauseClicked() {
    player.pause();
}

function downloadFrames() {
    let zip = new JSZip();

    let processed = 0;
    let totalFrames = framesManager.frames.totalFrames();
    for (let i = 0; i < totalFrames; i++) {
        framesManager.frames.getFrame(i).then((blob) => {
            zip.file(i + '.jpg', blob);

            processed++;
            if (processed == totalFrames) {
                let writeStream = streamSaver.createWriteStream('extracted-frames.zip').getWriter();
                zip.generateInternalStream({ type: 'uint8array', streamFiles: true })
                    .on('data', data => writeStream.write(data))
                    .on('end', () => writeStream.close())
                    .resume();
            }
        });
    }
}

function initializeCanvasDimensions(img) {
    doodle.style.width = img.width + 'px';
    doodle.style.height = img.height + 'px';
    canvas.width = img.width;
    canvas.height = img.height;
    sliderElement.style.width = img.width + 'px';
}

function extractionFileUploaded() {

    xmlFile.disabled = true;
    generateXmlButton.disabled = true;
    clearAllAnnotatedObjects();
    slider.reset();
    player.initialize();

    let promise;
    promise = extractFramesFromZip(config, zip_path);

    promise.then((frames) => {
        extractionProgressElement.innerHTML = 'Extraction completed. ' + frames.totalFrames() + ' frames captured.';
        if (frames.totalFrames() > 0) {
            frames.getFrame(0).then((blob) => {
                blobToImage(blob).then((img) => {
                    initializeCanvasDimensions(img);
                    ctx.drawImage(img, 0, 0);
                    videoDimensionsElement.innerHTML = 'Video dimensions determined: ' + img.width + 'x' + img.height;

                    framesManager.set(frames);
                    slider.init(
                        0,
                        framesManager.frames.totalFrames() - 1,
                        (frameNumber) => player.seek(frameNumber)
                    );
                    player.ready();

                    xmlFile.disabled = false;
                    playButton.disabled = false;
                    generateXmlButton.disabled = false;
                });
            });
        }
    });
}

function interactify(dom, onChange) {
    let bbox = $(dom);
    bbox.addClass('bbox');

    let createHandleDiv = (className) => {

        let handle = document.createElement('div');
        handle.className = className;
        bbox.append(handle);
        return handle;
    };

    bbox.resizable({
        containment: 'parent',
        handles: {
            n: createHandleDiv('ui-resizable-handle ui-resizable-n'),
            s: createHandleDiv('ui-resizable-handle ui-resizable-s'),
            e: createHandleDiv('ui-resizable-handle ui-resizable-e'),
            w: createHandleDiv('ui-resizable-handle ui-resizable-w'),
            q: createHandleDiv('floating-name'),
        },
        stop: (e, ui) => {
            let position = bbox.position();
            onChange(Math.round(position.left), Math.round(position.top), Math.round(bbox.width()), Math.round(bbox.height()));
        }
    });

    bbox.draggable({
        containment: 'parent',
        handle: createHandleDiv('handle center-drag'),
        stop: (e, ui) => {
            let position = bbox.position();
            onChange(Math.round(position.left), Math.round(position.top), Math.round(bbox.width()), Math.round(bbox.height()));
        }
    });
}

let mouse = {
    x: 0,
    y: 0,
    startX: 0,
    startY: 0
};

let tmpAnnotatedObject = null;

doodle.onmousemove = function (e) {
    let ev = e || window.event;
    if (ev.pageX) {
        mouse.x = ev.pageX;
        mouse.y = ev.pageY;
    } else if (ev.clientX) {
        mouse.x = ev.clientX;
        mouse.y = ev.clientY;
    }
    mouse.x -= doodle.offsetLeft;
    mouse.y -= doodle.offsetTop;

    if (tmpAnnotatedObject !== null) {
        tmpAnnotatedObject.width = Math.abs(mouse.x - mouse.startX);
        tmpAnnotatedObject.height = Math.abs(mouse.y - mouse.startY);
        tmpAnnotatedObject.x = (mouse.x - mouse.startX < 0) ? mouse.x : mouse.startX;
        tmpAnnotatedObject.y = (mouse.y - mouse.startY < 0) ? mouse.y : mouse.startY;

        tmpAnnotatedObject.dom.style.width = tmpAnnotatedObject.width + 'px';
        tmpAnnotatedObject.dom.style.height = tmpAnnotatedObject.height + 'px';
        tmpAnnotatedObject.dom.style.left = tmpAnnotatedObject.x + 'px';
        tmpAnnotatedObject.dom.style.top = tmpAnnotatedObject.y + 'px';
    }
    
}

doodle.onclick = function (e) {
    if (doodle.style.cursor != 'crosshair') {
        return;
    }

    if (tmpAnnotatedObject != null) {
        //console.log("inside onclick, wnnotated frame doesn't have expression")
        let annotatedObject = new AnnotatedObject();
        annotatedObject.dom = tmpAnnotatedObject.dom;
        let bbox = new BoundingBox(tmpAnnotatedObject.x, tmpAnnotatedObject.y, tmpAnnotatedObject.width, tmpAnnotatedObject.height);
        annotatedObject.add(new AnnotatedFrame(player.currentFrame, bbox, true));
        annotatedObjectsTracker.annotatedObjects.push(annotatedObject);
        tmpAnnotatedObject = null;

        interactify(
            annotatedObject.dom,
            (x, y, width, height) => {
                let bbox = new BoundingBox(x, y, width, height);
                annotatedObject.add(new AnnotatedFrame(player.currentFrame, bbox, true));
            }
        );
        addAnnotatedObjectControls(annotatedObject);
        doodle.style.cursor = 'default';
    } else {
        mouse.startX = mouse.x;
        mouse.startY = mouse.y;

        let dom = newBboxElement();
        dom.style.left = mouse.x + 'px';
        dom.style.top = mouse.y + 'px';
        tmpAnnotatedObject = { dom: dom };
    }
}

function newBboxElement() {
    let dom = document.createElement('div');
    dom.className = 'bbox';
    doodle.appendChild(dom);
    return dom;
}


function addAnnotatedObjectControls(annotatedObject) {
    let name = $('<input type="text" placeholder="Name?" />');
    if (annotatedObject.name) {
        name.val(annotatedObject.name);
    }
    name.on('change keyup paste mouseup', function () {
        annotatedObject.name = this.value;
    });

    let id = $('<input type="text" placeholder="ID?" />');
    if (annotatedObject.id) {
        id.val(annotatedObject.id);
    }
    id.on('change keyup paste mouseup', function () {
        annotatedObject.id = this.value;
    });

    let expression = $('<select id="expID" name ="expression" style = "width: 180px; height: 25px">\
    <option value="NA" selected>NA</option>\
    <option value="anger">anger</option>\
    <option value="contempt">contempt</option>\
    <option value="disgust">disgust</option>\
    <option value="fear">fear</option>\
    <option value="happiness">happiness</option>\
    <option value="neutral">neutral</option>\
    <option value="sadness">sadness</option>\
    <option value="surprise">surprise</option> </select>');

    if (annotatedObject.expression) {
        expression.val(annotatedObject.expression);
    }
    expression.on('change keyup paste mouseup', function () {
        annotatedObject.expression = this.value;
    });

    let visibleLabel = $('<label>');
    let visible = $('<input type="checkbox" checked="checked"/>');
    annotatedObject.visible = visible;

    visible.change(function () {
        let bbox;
        if (this.checked) {
            annotatedObject.dom.style.display = 'block';
            let jquery = $(annotatedObject.dom);
            let position = jquery.position();
            bbox = new BoundingBox(Math.round(position.left), Math.round(position.top), Math.round(jquery.width()), Math.round(jquery.height()));
        } else {
            annotatedObject.dom.style.display = 'none';
            bbox = null;
        }
        annotatedObject.add(new AnnotatedFrame(player.currentFrame, bbox, true));
    });

    visibleLabel.append(visible);
    visibleLabel.append('Is visible?');
    let hideLabel = $('<label>');
    let hide = $('<input type="checkbox" />');
    hide.change(function () {
        annotatedObject.hideOthers = this.checked;
    });
    hideLabel.append(hide);
    hideLabel.append('Hide others?');

    let del = $('<input type="button" value="Delete" />');
    del.click(function () {
        for (let i = 0; annotatedObjectsTracker.annotatedObjects.length; i++) {
            if (annotatedObject === annotatedObjectsTracker.annotatedObjects[i]) {
                clearAnnotatedObject(i);
                break;
            }
        }
    });

    let div = $('<div></div>');
    div.css({
        'border': '1px solid black',
        'display': 'inline-block',
        'margin': '5px',
        'padding': '10px'
    });

    div.append(name);
    div.append($('<br />'));
    div.append(id);
    div.append($('<br />'));
    div.append(expression);
    div.append($('<br />'));
    div.append(visibleLabel);
    div.append($('<br />'));
    div.append(hideLabel);
    div.append($('<br />'));
    div.append(del);

    annotatedObject.controls = div;

    $('#objects').append(div);

}

function generateXml() {
    let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
    xml += '<annotation>\n';
    xml += '  <folder>not available</folder>\n';
    xml += '  <filename>not available</filename>\n';
    xml += '  <source>\n';
    xml += '    <type>video</type>\n';
    xml += '    <sourceImage>vatic frames</sourceImage>\n';
    xml += '    <sourceAnnotation>vatic</sourceAnnotation>\n';
    xml += '  </source>\n';
    let totalFrames = framesManager.frames.totalFrames();
    for (let i = 0; i < annotatedObjectsTracker.annotatedObjects.length; i++) {
        let annotatedObject = annotatedObjectsTracker.annotatedObjects[i];

        xml += '  <object>\n';
        xml += '    <name>' + annotatedObject.name + '</name>\n';
        xml += '    <moving>true</moving>\n';
        xml += '    <action/>\n';
        xml += '    <verified>0</verified>\n';
        xml += '    <id>' + annotatedObject.id + '</id>\n';
        xml += '    <createdFrame>0</createdFrame>\n';
        xml += '    <startFrame>0</startFrame>\n';
        xml += '    <endFrame>' + (totalFrames - 1) + '</endFrame>\n';

        for (let frameNumber = 0; frameNumber < totalFrames; frameNumber++) {
            let annotatedFrame = annotatedObject.get(frameNumber);
            if (annotatedFrame == null) {
                //window.alert('Play the video in full before downloading the XML so that bounding box data is available for all frames.');
                //return;
            }
            else {

                let bbox = annotatedFrame.bbox;

                if (bbox != null) {
                    let isGroundThrugh = annotatedFrame.isGroundTruth ? 1 : 0;

                    xml += '    ';
                    xml += '<polygon>';
                    xml += '<t>' + frameNumber + '</t>';
                    //xml += '<expression>' + annotatedFrame.expression + '</expression>';
                    xml += '<expression>' + map_frame.get([frameNumber, annotatedObject.name]) + '</expression>';
                    xml += '<pt><x>' + bbox.x + '</x><y>' + bbox.y + '</y><l>' + isGroundThrugh + '</l></pt>';
                    xml += '<pt><x>' + bbox.x + '</x><y>' + (bbox.y + bbox.height) + '</y><l>' + isGroundThrugh + '</l></pt>';
                    xml += '<pt><x>' + (bbox.x + bbox.width) + '</x><y>' + (bbox.y + bbox.height) + '</y><l>' + isGroundThrugh + '</l></pt>';
                    xml += '<pt><x>' + (bbox.x + bbox.width) + '</x><y>' + bbox.y + '</y><l>' + isGroundThrugh + '</l></pt>';
                    xml += '</polygon>\n';
                }

            }
        }
        xml += '  </object>\n';
    }
    xml += '</annotation>\n';

    let writeStream = streamSaver.createWriteStream(file_name + '_output.xml').getWriter();
    let encoder = new TextEncoder();
    writeStream.write(encoder.encode(xml));
    writeStream.close();
}

function importXml() {
    if (this.files.length != 1) {
        return;
    }

    var reader = new FileReader();
    reader.onload = (e) => {
        if (e.target.readyState != 2) {
            return;
        }

        if (e.target.error) {
            throw 'file reader error';
        }

        let xml = $($.parseXML(e.target.result));
        let objects = xml.find('object');
        for (let i = 0; i < objects.length; i++) {
            let object = $(objects[i]);
            let name = object.find('name').text();
            let id = object.find('id').text();

            let annotatedObject = new AnnotatedObject();
            annotatedObject.name = name;
            annotatedObject.id = id;
            annotatedObject.dom = newBboxElement();
            annotatedObjectsTracker.annotatedObjects.push(annotatedObject);

            interactify(
                annotatedObject.dom,
                (x, y, width, height) => {
                    let bbox = new BoundingBox(x, y, width, height);
                    annotatedObject.add(new AnnotatedFrame(player.currentFrame, bbox, true));
                }
            );

            addAnnotatedObjectControls(annotatedObject);

            let lastFrame = -1;
            let polygons = object.find('polygon');
            for (let j = 0; j < polygons.length; j++) {
                let polygon = $(polygons[j]);
                let frameNumber = parseInt(polygon.find('t').text());
                let pts = polygon.find('pt');
                let topLeft = $(pts[0]);
                let bottomRight = $(pts[2]);
                let isGroundTruth = parseInt(topLeft.find('l').text()) == 1;
                let x = parseInt(topLeft.find('x').text());
                let y = parseInt(topLeft.find('y').text());
                let w = parseInt(bottomRight.find('x').text()) - x;
                let h = parseInt(bottomRight.find('y').text()) - y;

                if (polygon.find("expression").text()) {
                    let expr = polygon.find("expression").text();
                    if (expr == 'undefined'){
                        newExpression(frameNumber,annotatedObject.name, undefined)

                    }else{
                        newExpression(frameNumber,annotatedObject.name, expr);
                    }
                    
                }

                if (lastFrame + 1 != frameNumber) {
                    let annotatedFrame = new AnnotatedFrame(lastFrame + 1, null, true);
                    annotatedObject.add(annotatedFrame);
                }

                let bbox = new BoundingBox(x, y, w, h);
                let annotatedFrame = new AnnotatedFrame(frameNumber, bbox, isGroundTruth);
                annotatedObject.add(annotatedFrame);

                lastFrame = frameNumber;
            }

            if (lastFrame + 1 < framesManager.frames.totalFrames()) {
                let annotatedFrame = new AnnotatedFrame(lastFrame + 1, null, true);
                annotatedObject.add(annotatedFrame);
            }
        }
        player.drawFrame(player.currentFrame);
    };
    reader.readAsText(this.files[0]);
}

// Keyboard shortcuts
window.onkeydown = function (e) {
    let preventDefault = true;

    if (e.keyCode === 32) { // space
        player.toogle();
    } else if (e.keyCode === 45) { // n
        doodle.style.cursor = 'crosshair';
    } else if (e.keyCode === 27) { // escape
        if (tmpAnnotatedObject != null) {
            doodle.removeChild(tmpAnnotatedObject.dom);
            tmpAnnotatedObject = null;
        }

        doodle.style.cursor = 'default';
    } else if (e.keyCode == 37) { // left
        player.seek(player.currentFrame - 1);
    } else if (e.keyCode == 39) { // right
        player.seek(player.currentFrame + 1);
    } else {
        preventDefault = false;
    }

    if (preventDefault) {
        e.preventDefault();
    }
};
