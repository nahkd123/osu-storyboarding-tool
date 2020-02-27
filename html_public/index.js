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
        state: "paused"
    }
};

var Layers = [];
var LayersDOM = document.querySelector("div#layersview");
var SelectedLayer = null;

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
    soild(x, y, w, h, r = 255, g = 255, b = 255) {
        return {
            type: "soild",
            x: x,
            y: y,
            width: w,
            height: h,
            red: r,
            green: Math.round(Math.random() * 255),
            blue: b
        }
    }
};
function renderObject(obj, ctx) {
    if (obj.type === "soild") {
        ctx.fillStyle = `rgb(${obj.red}, ${obj.green}, ${obj.blue})`;
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    }
}
function renderSelected(obj, ctx) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#efefef";
    ctx.strokeRect(
        obj.x - 5,
        obj.y - 5,
        obj.width + 10,
        obj.height + 10
    );
    ctx.fillStyle = "#ceceff";
    ctx.fillRect(obj.x - 12, obj.y - 12, 7, 7);
    ctx.fillRect(obj.x + obj.width + 5, obj.y + obj.height + 5, 7, 7);
    ctx.fillRect(obj.x - 12, obj.y + obj.height + 5, 7, 7);
    ctx.fillRect(obj.x + obj.width + 5, obj.y - 12, 7, 7);
}
function addLayer(obj) {
    var out = {
        toggled: true,
        name: "Unnamed " + obj.type,
        startTime: 0,
        endTime: 1000,
        animations: [],
        object: obj
    };
    if (SelectedLayer !== null) SelectedLayer.linked.select.classList.remove("selected");
    SelectedLayer = out;
    // Layers[Layers.length] = out;
    Layers.push(out);

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
    timelineView.width = 100;
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

    var layerMenu = FloatMenu.create();
    layerMenu.buttons["Remove Object"] = () => {
        layerDOM.remove();
        Layers.splice(Layers.indexOf(out), 1);
        if (SelectedLayer === out) SelectedLayer = null;
    };
    layerMenu.buttons["Close"] = () => {};
    selectButton.addEventListener("contextmenu", (event) => {
        // left click
        event.preventDefault();
        FloatMenu.displayMenu(layerMenu, event.clientX, event.clientY);
    });

    LayersDOM.prepend(layerDOM);
    
    out.linked = {
        toggle: toggleButton,
        select: selectButton,
        timeline: timelineView,
        rclickMenu: layerMenu
    };

    return out;
}
function play() {
    if (Session.player.state === "paused") Session.player.state = "playing";
    else Session.player.state = "paused";
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
    Layers.forEach(layer => {if (layer.toggled && seek >= layer.startTime && seek <= layer.endTime) {
        // Render layer uwu
        renderObject(layer.object, ctx);
    }});

    // Overlays
    if (SelectedLayer !== null) renderSelected(SelectedLayer.object, ctx);
    if (StoryboardConfigure.RenderDebug) renderDebug(ctx);

    Session.updates.timestamp = timestamp;
    window.requestAnimationFrame(updateFrame);
}
window.requestAnimationFrame(updateFrame);