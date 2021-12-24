"use strict";

// Begin namespace
try{
(async () => {
    // Canvas height: 1024 px at maximum.
    const CANVAS_MAX_HEIGHT = 256;
    const CSS_PREFIX = `_ANNOTATOR__`;
    const CSS = `
        .${CSS_PREFIX}growBtn {
            color: white;
            background: black;
            font: 12pt sans;
            text-align: center;
            display: block;

            border: 1px solid gray;
            border-radius: 0px;

            padding-bottom: 10px;
            padding-top: 10px;

            width: 80%;
            margin-left: auto;
            margin-right: auto;
        }

        .${CSS_PREFIX}growBtn:focus {
            border: 1px dotted red;
        }

        .${CSS_PREFIX}mainContainer {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            touch-action: pinch-zoom;
            z-index: 9999999999999;
        }

        .${CSS_PREFIX}canvasContainer {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            z-index: -99999999;
            display: flex;
            flex-direction: column;
        }
    `;

    // Don't re-inject
    if (window.__ANNOTATOR_SCRIPT_INJECTED) {
        return;
    }
    window.__ANNOTATOR_SCRIPT_INJECTED = true;

    /**
     * Ensure that the drawing context's internal width matches the
     * canvas' styled width and height.
     */
    const resizeCanvas = function(canvas) {
        if (canvas.width != canvas.clientWidth || canvas.height != canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }
    };

    /**
     * Add canvases to, otherwise prepare the given element to be annotated.
     */
    const annotateElement = function(element) {
        let mainContainer = document.createElement("div");
        let inputArea = document.createElement("div");
        let canvasContainer = document.createElement("div");
        let drawingCtxs = [];
        let pointersDown = {};
        let lastBuffer = [];
        let lineColor = "red";
        let lineWidth = 2;
        let pointerDownCount = 0;

        mainContainer.classList.add(`${CSS_PREFIX}mainContainer`);
        canvasContainer.classList.add(`${CSS_PREFIX}canvasContainer`);

        const addCanvas = () => {
            let canvas = document.createElement("canvas");
            canvas.width = element.clientWidth;
            canvas.height = CANVAS_MAX_HEIGHT;

            let ctx = canvas.getContext("2d");
            drawingCtxs.push(ctx);

            inputArea.style.height = `${drawingCtxs.length * CANVAS_MAX_HEIGHT}px`;

            canvasContainer.appendChild(canvas);
        };

        /// Get the drawing context targeted by the given point.
        const getCtx = (point) => {
            let idx = Math.floor(point.y / CANVAS_MAX_HEIGHT);

            return drawingCtxs[idx];
        };

        const getPoint = (evt) => {
            let x = evt.offsetX;
            let y = evt.offsetY;

            return {
                x: x, y: y,
                t: (new Date()).getTime(),

                pressure: evt.pressure
            };
        };

        let isStart = false;
        const startLine = (point) => {
            lastBuffer = [];
            isStart = true;
        };

        const continueLine = (point) => {
            lastBuffer.push(point);
            if (lastBuffer.length < 4) {
                return;
            }

            const draw = (ctx, ctxY) => {
                let p3 = lastBuffer[3];
                let p2 = lastBuffer[2];
                let p1 = lastBuffer[1];
                let p0 = lastBuffer[0];

                let x0 = p0.x, x1 = p1.x, x2 = p2.x, x3 = p3.x;
                let y0 = p0.y - ctxY,
                    y1 = p1.y - ctxY,
                    y2 = p2.y - ctxY,
                    y3 = p3.y - ctxY;

                let vx = (x1 - x0) / (p1.t - p0.t);
                let vy = (y1 - y0) / (p1.t - p0.t);

                vx *= 0.5 * (p2.t - p1.t);
                vy *= 0.5 * (p2.t - p1.t);

                ctx.beginPath();
                if (isStart) {
                    ctx.moveTo(x0, y0);
                    ctx.lineTo(x1, y1);
                } else {
                    ctx.moveTo(x1, y1);
                }
                ctx.bezierCurveTo(x1 + vx, y1 + vy, x2, y2, x3, y3);
                ctx.stroke();
            };

            let lastCtx = null;

            for (let point of lastBuffer) {
                let ctx = getCtx(point);
                let ctxY = Math.floor(point.y / CANVAS_MAX_HEIGHT) * CANVAS_MAX_HEIGHT;

                if (ctx != lastCtx) {
                    ctx.save();
                    ctx.fillStyle = lineColor;
                    ctx.strokeStyle = lineColor;
                    ctx.lineWidth = lineWidth;

                    draw(ctx, ctxY);
                    ctx.restore();
                }

                lastCtx = ctx;
            }

            lastBuffer = [lastBuffer[lastBuffer.length - 2], point];
            isStart = false;
        };

        // Add all necessary canvases.
        for (let i = 0; i < element.clientHeight; i += CANVAS_MAX_HEIGHT) {
            addCanvas();
        }

        inputArea.addEventListener("pointerdown", (evt) => {
            inputArea.setPointerCapture(evt.pointerId);

            evt.preventDefault();
            startLine(getPoint(evt));

            pointersDown[evt.pointerId] = true;
        });

        inputArea.addEventListener("pointermove", (evt) => {
            if (pointersDown[evt.pointerId] && evt.isPrimary) {
                evt.preventDefault();
                continueLine(getPoint(evt));
            }
        });

        inputArea.addEventListener("pointerup", (evt) => {
            evt.preventDefault();
            inputArea.releasePointerCapture(evt.pointerId);

            pointersDown[evt.pointerId] = false;
            continueLine(getPoint(evt));

            let point = getPoint(evt);
            let ctx = getCtx(point);
            let ctxY = Math.floor(point.y / CANVAS_MAX_HEIGHT) * CANVAS_MAX_HEIGHT;

            ctx.beginPath();
            ctx.fillStyle = lineColor;
            ctx.arc(point.x, point.y - ctxY, lineWidth / 2.0, 0, Math.PI * 2, true);
            ctx.fill();
        });

        inputArea.addEventListener("pointerleave", (evt) => {
            pointersDown[evt.pointerId] = false;
        });

        chrome.runtime.onMessage.addListener((message) => {
            if (message.command === "setThickness") {
                lineWidth = message.value;
            } else if (message.command === "setColor") {
                lineColor = message.value;
            } else if (message.command === "toggleInput") {
                mainContainer.style.display = mainContainer.style.display == "none" ? "block" : "none";
            }
        });

        // Add a button to expand the drawing area.
        let expandBtn = document.createElement("button");
        expandBtn.innerHTML = "+";
        expandBtn.classList.add(`${CSS_PREFIX}growBtn`);

        expandBtn.onclick = () => {
            addCanvas();
        };

        mainContainer.appendChild(inputArea);
        mainContainer.appendChild(expandBtn);
        element.appendChild(mainContainer);
        element.appendChild(canvasContainer);
    };

    annotateElement(document.body);

    // Inject CSS
    let cssElem = document.createElement("style");
    cssElem.appendChild(document.createTextNode(CSS));
    document.documentElement.appendChild(cssElem);
})();
} catch(e) { console.error(e); }
