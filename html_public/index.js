/*
made by nahkd123 uwu
*/
const StoryboardConfigure = {
    PlayArea: {
        // https://osu.ppy.sh/help/wiki/Storyboard_Scripting/General_Rules
        width: 510,
        height: 385,
        x: 60,
        y: 55
    },
    StoryboardArea: {
        width: 640,
        height: 480,
        x: 0, y: 0
    },
    RenderDebug: true
};
const Enums = {
    property: ["position", "scale", "alpha"],
    easing: ["none", "in", "out", "smooth in", "smooth out"]
};
const DefaultValues = {
    "position": ["x", "y"],
    "scale": [],
    "alpha": ["alpha"]
};
const Easing = {
    "none": bezier(0, 0, 1, 1),
    "in": bezier(0.42, 0, 1, 1),
};
var Session = {
    updates: {
        timestamp: 0,
        timedelta: 0
    },
    snapping: {
        enabled: true,
        mode: "storyboard", // storyboard for whole screen, playarea for only playarea.
    },
    grid: {
        storyboard: false,
        playarea: true
    },
    canvas: {
        ctx: document.querySelector("canvas#screen").getContext("2d")
    },
    player: {
        seek: 0,
        state: "paused",
        seekBar: document.querySelector("canvas#timeline").getContext("2d"),
        seekBarZoom: 10, // 10/1000 ms
        seekScroll: 0,
    },
    propertilesViewer: document.querySelector("div#propertilesview")
};

var Layers = [];
var AnimationLayers = [];
var LayersDOM = document.querySelector("div#layersview");
// var SelectedLayer = null;
(function() {
    var _selectedLayer = null;
    Object.defineProperties(window, {SelectedLayer: {
        get() {
            return _selectedLayer;
        },
        set(value) {
            if (_selectedLayer !== null) {
            }
            _selectedLayer = value;
            toPropertilesView(value?.object);
        }
    }});
})();

/**
 * Draw playarea (510 x 385) guide
 * @param {CanvasContext} ctx The canvas context to draw
**/
function renderPlayareaGuide(ctx) {
    const x = StoryboardConfigure.PlayArea.x;
    const y = StoryboardConfigure.PlayArea.y;
    const w = StoryboardConfigure.PlayArea.width;
    const h = StoryboardConfigure.PlayArea.height;
    
    ctx.strokeStyle = "#efefef2a";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + (w / 2), y); ctx.lineTo(x + (w / 2), y + h);
    ctx.moveTo(x, y + (h / 2)); ctx.lineTo(x + w, y + (h / 2));
    ctx.stroke();

    ctx.strokeStyle = "#efefef1c";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + (w / 4), y); ctx.lineTo(x + (w / 4), y + h);
    ctx.moveTo(x + (w / 4 * 3), y); ctx.lineTo(x + (w / 4 * 3), y + h);
    ctx.moveTo(x, y + (h / 4)); ctx.lineTo(x + w, y + (h / 4));
    ctx.moveTo(x, y + (h / 4 * 3)); ctx.lineTo(x + w, y + (h / 4 * 3));
    ctx.stroke();
}
function renderDebug(ctx) {
    ctx.font = "12px monospace";
    ctx.fillStyle = "white";
    ctx.fillText("FPS: " + Math.round(1000 / Session.updates.timedelta) + " (" + Math.round(Session.updates.timedelta) + ")", 5, 12);
    ctx.fillText("MS Passed: " + Math.round(Session.updates.timestamp), 5, 24);
    ctx.fillText("Player: " + Session.player.state + " - " + Math.round(Session.player.seek), 5, 36);
}

// We'll use these functions for buttons and stuffs owo
const EditorObjects = {
    soild(x, y, w, h, r = 255, g = 255, b = 255, a = 255) {
        return {
            type: "soild",
            x: x,
            y: y,
            width: w,
            height: h,
            red: r,
            green: g,
            blue: b,
            alpha: a
        }
    },
    animation(obj) {
        return {
            type: "animation",
            object: obj,
            // property: "position",
            _property: "position",
            get property() {return this._property;},
            set property(value) {
                this._property = value;
                this.fromValue = []; this.toValue = [];
                DefaultValues[value].forEach((p, i) => {
                    if (typeof p === "number") {this.fromValue[i] = p; this.toValue[i] = p;}
                    else if (typeof p === "string") {this.fromValue[i] = this.object[p]; this.toValue[i] = this.object[p];}
                });
            },
            fromValue: [obj.x, obj.y],
            toValue: [obj.x, obj.y],
            easing: "none"
        };
    }
};
function renderObject(obj, ctx) {
    if (obj.type === "soild") {
        ctx.fillStyle = `rgba(${obj.red}, ${obj.green}, ${obj.blue}, ${obj.alpha / 255})`;
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    }
}
function processAnimation(layer) {
    var obj = layer.object;
    const progress = Easing[obj.easing]((layer.endTime - Session.player.seek) / (layer.endTime - layer.startTime));
    if (obj.property === "position") {
        obj.object.x = (obj.fromValue[0] - obj.toValue[0]) * progress + obj.toValue[0];
        obj.object.y = (obj.fromValue[1] - obj.toValue[1]) * progress + obj.toValue[1];
    } else if (obj.property === "alpha") {obj.object.alpha = (obj.fromValue[0] - obj.toValue[0]) * progress + obj.toValue[0];}
}
function renderSelected(layer, ctx) {
    var obj = layer.object;
    if (obj.type !== "animation") {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#efefef";
        ctx.strokeRect(obj.x - 5, obj.y - 5, obj.width + 10, obj.height + 10);
        ctx.fillStyle = "#ceceff";
        ctx.fillRect(obj.x - 12, obj.y - 12, 7, 7);
        ctx.fillRect(obj.x + obj.width + 5, obj.y + obj.height + 5, 7, 7);
        ctx.fillRect(obj.x - 12, obj.y + obj.height + 5, 7, 7);
        ctx.fillRect(obj.x + obj.width + 5, obj.y - 12, 7, 7);
    } else {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#efefef";
        ctx.strokeRect(obj.object.x - 5, obj.object.y - 5, obj.object.width + 10, obj.object.height + 10);
    }

    var cttx = layer.linked.timeline.getContext("2d");
    cttx.fillStyle = "#ceceff";
    const rectX = (layer.startTime - Session.player.seekScroll) / Session.player.seekBarZoom;
    const rectW = (layer.endTime - layer.startTime) / Session.player.seekBarZoom;
    cttx.fillRect(rectX, 0, 5, 29);
    cttx.fillRect(rectX + rectW - 5, 0, 5, 29);
}
function addLayer(obj) {
    var out = {
        toggled: true,
        name: obj.type === "animation"? "Animation (" + obj.object.linkedLayer.name + ")" : "Unnamed " + obj.type,
        startTime: Session.player.seek,
        endTime: Session.player.seek + 1000,
        object: obj
    };
    if (SelectedLayer !== null) SelectedLayer.linked.select.classList.remove("selected");
    SelectedLayer = out;
    // Layers[Layers.length] = out;
    Layers.push(out);
    if (obj.type === "animation") AnimationLayers.push(out);

    // Create new element
    var layerDOM = document.createElement("div");
    layerDOM.classList.add("layer");

    var toggleButton = document.createElement("button");
    toggleButton.classList.add("layerbutton");
    toggleButton.classList.add("toggle");
    toggleButton.textContent = "✅";
    layerDOM.append(toggleButton);

    var selectButton = document.createElement("button");
    selectButton.classList.add("layername");
    selectButton.classList.add("selected");
    selectButton.textContent = out.name;
    layerDOM.append(selectButton);

    var timelineView = document.createElement("canvas");
    timelineView.width = Session.player.seekBar.canvas.width;
    timelineView.height = 27;
    layerDOM.append(timelineView);

    toggleButton.addEventListener("click", () => {
        if (out.toggled) {
            toggleButton.textContent = "⬜";
            selectButton.style.color = "#cecece";
        } else {
            toggleButton.textContent = "✅";
            selectButton.style.color = "";
        }
        out.toggled = !out.toggled;
    });
    selectButton.addEventListener("click", () => {
        if (SelectedLayer !== null) SelectedLayer.linked.select.classList.remove("selected");
        SelectedLayer = out;
        selectButton.classList.add("selected");
    });
    (function() {
        var mousedown = false;
        var mousex = 0;
        var mousey = 0;
        var ends = 0;

        timelineView.addEventListener("mousedown", (event) => {
            var rectX = (out.startTime - Session.player.seekScroll) / Session.player.seekBarZoom;
            var rectXEnd = (out.endTime - Session.player.seekScroll) / Session.player.seekBarZoom;
            mousex = event.offsetX;
            mousey = event.offsetY;
            ends = 0;
            if (mousex >= rectX - 5 && mousex <= rectXEnd + 5) {
                mousedown = true;
                if (SelectedLayer !== out) {
                    if (SelectedLayer) SelectedLayer.linked.select.classList.remove("selected");
                    SelectedLayer = out;
                    selectButton.classList.add("selected");
                } else {
                    if (mousex >= rectX - 5 && mousex <= rectX + 5) {ends = 1;}
                    else if (mousex >= rectXEnd - 5 && mousex <= rectXEnd + 5) {ends = 2;}
                }
            } else {
                if (SelectedLayer) SelectedLayer.linked.select.classList.remove("selected");
                SelectedLayer = null;
            }
        });
        timelineView.addEventListener("mousemove", (event) => {
            if (mousedown) {
                var rectX = (out.startTime - Session.player.seekScroll) / Session.player.seekBarZoom;
                var rectXEnd = (out.endTime - Session.player.seekScroll) / Session.player.seekBarZoom;
                if (ends === 0) {
                    // Move bar
                    const timedelta = out.endTime - out.startTime;
                    out.startTime += (event.offsetX - mousex) * Session.player.seekBarZoom;
                    out.endTime = out.startTime + timedelta;
                } else if (ends === 1) {
                    out.startTime += (event.offsetX - mousex) * Session.player.seekBarZoom;
                } else if (ends === 2) {
                    out.endTime += (event.offsetX - mousex) * Session.player.seekBarZoom;
                }
                mousex = event.offsetX;
                mousey = event.offsetY;
            }
        });
        timelineView.addEventListener("mouseup", (event) => {
            mousedown = false;
        });
    })();

    var layerMenu = FloatMenu.create();
    layerMenu.buttons["Remove Object"] = () => {
        layerDOM.remove();
        Layers.splice(Layers.indexOf(out), 1);
        if (SelectedLayer === out) SelectedLayer = null;
    };
    layerMenu.buttons["Add animation"] = () => {
        addLayer(EditorObjects.animation(obj));
    };
    layerMenu.buttons["Close"] = () => {};
    selectButton.addEventListener("contextmenu", (event) => {
        // left click
        event.preventDefault();
        FloatMenu.displayMenu(layerMenu, event.clientX, event.clientY);
    });

    if (obj.type !== "animation") LayersDOM.prepend(layerDOM);
    else LayersDOM.insertBefore(layerDOM, obj.object.linkedLayer.linked.dom.nextSibling);
    
    out.linked = {
        toggle: toggleButton,
        select: selectButton,
        timeline: timelineView,
        rclickMenu: layerMenu,
        dom: layerDOM
    };
    obj.linkedLayer = out;

    return out;
}
function play() {
    if (Session.player.state === "paused") Session.player.state = "playing";
    else Session.player.state = "paused";
}
function renderSeekBars() {
    const seekZoomSeg = 1000 / Session.player.seekBarZoom;
    const seek = (Session.player.seek - Session.player.seekScroll) / Session.player.seekBarZoom;
    var ctx = Session.player.seekBar;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = "#efefef";
    ctx.beginPath();
    ctx.moveTo(seekZoomSeg, 10);
    ctx.lineTo(seekZoomSeg + 5, 15);
    ctx.lineTo(seekZoomSeg, 20);
    ctx.lineTo(seekZoomSeg - 5, 15);
    ctx.fill();

    ctx.fillStyle = "#ceceff";
    ctx.beginPath();
    ctx.moveTo(seek, 30);
    ctx.lineTo(seek + 7, 23);
    ctx.lineTo(seek + 7, 10);
    ctx.lineTo(seek - 7, 10);
    ctx.lineTo(seek - 7, 23);
    ctx.fill();

    Layers.forEach(layer => {
        const start = layer.startTime - Session.player.seekScroll;
        const end = layer.startTime - Session.player.seekScroll;

        var cttx = layer.linked.timeline.getContext("2d");
        cttx.clearRect(0, 0, layer.linked.timeline.width, layer.linked.timeline.height);

        // render the bar thing
        cttx.fillStyle = (layer.object.type === "animation")? "#ffcece" : "#ceffce";
        const rectX = (layer.startTime - Session.player.seekScroll) / Session.player.seekBarZoom;
        const rectW = (layer.endTime - layer.startTime) / Session.player.seekBarZoom;
        cttx.fillRect(rectX, 5, rectW, 19);

        /* var lineIndex = 0;
        cttx.strokeStyle = "#efefef";
        cttx.beginPath();
        while (lineIndex * seekZoomSeg <= layer.linked.timeline.width) {
            cttx.moveTo(lineIndex * seekZoomSeg, 15);
            cttx.lineTo(lineIndex * seekZoomSeg, 29);
            lineIndex++;
        }
        cttx.stroke(); */
        cttx.lineWidth = 2;
        cttx.strokeStyle = "#787878";
        cttx.beginPath();
        cttx.moveTo(seek, 0);
        cttx.lineTo(seek, 29);
        cttx.stroke();
    });
}
function createPropertyDOM(obj, propertyName) {
    var out = document.createElement("div");
    out.id = "property";

    var name = document.createElement("div");
    name.classList.add("propertyname");
    name.textContent = propertyName;
    out.append(name);

    var val = document.createElement("div");
    val.classList.add("propertyvalue");

    if (obj[propertyName] instanceof Array) {
        // Multiple values
        val.classList.add("multiplevalues");
        val.textContent = obj[propertyName].join(",");

        val.addEventListener("input", (event) => {
            obj[propertyName] = [];
            val.textContent.split(",").forEach(v => {obj[propertyName].push(parseFloat(v))});
        });
    } else if (typeof obj[propertyName] === "string") {
        val.classList.add("list");
        val.textContent = obj[propertyName];

        var menu = FloatMenu.create();
        Enums[propertyName].forEach(p => {
            menu.buttons[p] = () => {
                obj[propertyName] = p;
                val.textContent = p;
            };
        });
        val.addEventListener("click", (event) => {FloatMenu.displayMenu(menu, event.clientX, event.clientY)});
    } else if (typeof obj[propertyName] === "number") {
        // Single value
        val.classList.add("multiplevalues");
        val.textContent = obj[propertyName] + "";

        val.addEventListener("input", (event) => {
            obj[propertyName] = parseFloat(val.textContent);
        });
    }
    out.append(val);
    Session.propertilesViewer.append(out);
    return out;
}
function toPropertilesView(obj) {
    // Remove old propertiles
    while (Session.propertilesViewer.children.length > 0) Session.propertilesViewer.children[0].remove();

    if (obj !== undefined && obj !== null) for (var pname in obj) if (pname !== "type" && pname !== "linkedLayer" && !(pname.startsWith("_"))) createPropertyDOM(obj, pname);
}
const Menus = {
    timelineAdd: FloatMenu.create(),
    file: FloatMenu.create(),
    canvas: FloatMenu.create()
};
Menus.timelineAdd.buttons["Soild"] = (event) => {
    addLayer(EditorObjects.soild(60, 55, 100, 100));
};
Menus.timelineAdd.buttons["Close"] = (event) => {};

Menus.file.buttons["Close"] = (event) => {}

Menus.canvas.buttons["Add object"] = (event) => {}
Menus.canvas.buttons["Close"] = (event) => {}

// Canvas event for interactive experience uwu
(function() {
    var ctx = Session.canvas.ctx;
    var canvas = ctx.canvas;

    var mousedown = [false, 0, 0];
    var clickedLayer = null;

    function getClickedLayer(mousedown) {
        const seek = Session.player.seek;
        clickedLayer = null;
        for (var i = Layers.length - 1; i >= 0; i--) {
            var layer = Layers[i].object;
            if (
                (Layers[i].toggled && seek >= Layers[i].startTime && seek <= Layers[i].endTime) &&
                (mousedown[1] >= layer.x && mousedown[2] >= layer.y && mousedown[1] <= layer.x + layer.width && mousedown[2] <= layer.y + layer.height)
            ) {
                if (SelectedLayer !== null) SelectedLayer.linked.select.classList.remove("selected");
                clickedLayer = SelectedLayer = Layers[i];
                clickedLayer.linked.select.classList.add("selected");
                return;
            }
        }
        if (SelectedLayer !== null) {
            SelectedLayer.linked.select.classList.remove("selected");
            SelectedLayer = null;
        }
    }

    canvas.onmousedown = (event) => {
        mousedown[0] = true;
        mousedown[1] = event.offsetX;
        mousedown[2] = event.offsetY;
        getClickedLayer(mousedown);
    }
    canvas.oncontextmenu = (event) => {
        event.preventDefault();
        getClickedLayer([false, event.offsetX, event.offsetY]);
        if (clickedLayer !== null) {
            FloatMenu.displayMenu(clickedLayer.linked.rclickMenu, event.clientX, event.clientY);
        } else {
            FloatMenu.displayMenu(Menus.canvas, event.clientX, event.clientY);
        }
    };
    canvas.onmousemove = (event) => {
        if (mousedown[0] === true && clickedLayer) {
            clickedLayer.object.x += event.offsetX - mousedown[1];
            clickedLayer.object.y += event.offsetY - mousedown[2];
            mousedown[1] = event.offsetX;
            mousedown[2] = event.offsetY;
        }
    };
    canvas.onmouseup = (event) => {
        mousedown[0] = false;
    }
})();
(function() {
    Session.player.seekBar.canvas.addEventListener("wheel", (event) => {
        if (event.ctrlKey) {
            Session.player.seekBarZoom += Math.sign(event.deltaY);
            event.preventDefault();
        } else Session.player.seekScroll += Math.sign(event.deltaY) * 100;
    });
})();
// Other UI-related events
function resize(event) {
    Session.player.seekBar.canvas.width = window.innerWidth - 822;
}
window.addEventListener("resize", resize);
resize();

// Shortcut + Keys
document.addEventListener("keypress", (event) => {
    if (event.code === "Space") play();
    if (event.code === "KeyA") Session.player.seek -= 10;
    if (event.code === "KeyD") Session.player.seek += 10;
});

// This function will be called 60 frames per second (maybe higher, depends on user hardware)
function updateFrame(timestamp) {
    var timedelta = Session.updates.timedelta = timestamp - Session.updates.timestamp;

    // Process stuffs
    var ctx = Session.canvas.ctx;
    ctx.clearRect(
        StoryboardConfigure.StoryboardArea.x,
        StoryboardConfigure.StoryboardArea.y,
        StoryboardConfigure.StoryboardArea.width,
        StoryboardConfigure.StoryboardArea.height
    );
    if (Session.grid.playarea) renderPlayareaGuide(ctx);
    
    // Player
    if (Session.player.state === "playing") {
        Session.player.seek += timedelta;
    }
    const seek = Session.player.seek;
    // We process animation layers first, then we'll process object layers
    AnimationLayers.forEach(layer => {if (layer.toggled && seek >= layer.startTime && seek <= layer.endTime) {
        processAnimation(layer);
    }});
    Layers.forEach(layer => {if (layer.toggled && seek >= layer.startTime && seek <= layer.endTime) {
        // Render layer uwu
        renderObject(layer.object, ctx);
    }});

    renderSeekBars();

    // Overlays
    if (SelectedLayer !== null) renderSelected(SelectedLayer, ctx);
    if (StoryboardConfigure.RenderDebug) renderDebug(ctx);

    Session.updates.timestamp = timestamp;
    window.requestAnimationFrame(updateFrame);
}
window.requestAnimationFrame(updateFrame);