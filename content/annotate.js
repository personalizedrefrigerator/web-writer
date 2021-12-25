"use strict";

try{

// Begin namespace
(async () => {
    // Canvas height: 1024 px at maximum.
    const CANVAS_MAX_HEIGHT = 256;
    const CSS_PREFIX = `_ANNOTATOR__`;
    const Z_IDX_MAGNITUDE = 999999999999999;
    const SVG_PADDING = 10;
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
            z-index: ${Z_IDX_MAGNITUDE};
        }

        .${CSS_PREFIX}previewCanvas {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;

            z-index: -${Z_IDX_MAGNITUDE};
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
        let inputArea = element;//document.createElement("div");
        //let svgContainer = document.createElement("div");
        let previewCanvas = document.createElement("canvas");
        let previewCtx = previewCanvas.getContext('2d');
        let pointersDown = {};
        let lastBuffer = [];
        let lineColor = "red";
        let lineWidth = 2;
        let pointerDownCount = 0;
        let svgPath = [];

        mainContainer.classList.add(`${CSS_PREFIX}mainContainer`);
        previewCanvas.classList.add(`${CSS_PREFIX}previewCanvas`);

        const getPoint = (evt) => {
            let x = evt.offsetX;
            let y = evt.offsetY;

            return {
                x: x, y: y,
                clientX: evt.clientX, clientY: evt.clientY,
                t: (new Date()).getTime(),

                pressure: evt.pressure || 0.6,
            };
        };

        let isStart = false;
        const startLine = (point) => {
            previewCanvas.style.display = "block";
            resizeCanvas(previewCanvas);
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

            lastBuffer = [];
            isStart = true;
            svgPath = [];
        };

        const continueLine = (point) => {
            lastBuffer.push(point);
            if (lastBuffer.length < 4) {
                return;
            }

            const draw = (ctx, ctxX, ctxY) => {
                let p3 = lastBuffer[3];
                let p2 = lastBuffer[2];
                let p1 = lastBuffer[1];
                let p0 = lastBuffer[0];

                let d0 = p0.pressure * lineWidth;
                let d1 = p1.pressure * lineWidth;
                let d2 = p2.pressure * lineWidth;
                let d3 = p3.pressure * lineWidth;
                let di = (d1 + d2) / 2.0;

                let x0 = p0.x, x1 = p1.x, x2 = p2.x, x3 = p3.x;
                let y0 = p0.y,
                    y1 = p1.y,
                    y2 = p2.y,
                    y3 = p3.y;

                let vx = (x1 - x0) / (p1.t - p0.t);
                let vy = (y1 - y0) / (p1.t - p0.t);

                vx *= 0.5 * (p2.t - p1.t);
                vy *= 0.5 * (p2.t - p1.t);

                const moveTo = (x, y) => {
                    ctx.moveTo(x - ctxX, y - ctxY);
                    svgPath.push(['M', [[x, y]]]);
                };

                const lineTo = (x, y) => {
                    ctx.lineTo(x - ctxX, y - ctxY);
                    svgPath.push([`L`, [[x, y]]]);
                };

                const curveTo = (x1, y1, x2, y2, x3, y3) => {
                    ctx.bezierCurveTo(x1 - ctxX, y1 - ctxY, x2 - ctxX, y2 - ctxY, x3 - ctxX, y3 - ctxY);
                    svgPath.push([`C`, [[x1, y1], [x2, y2], [x3, y3]]]);
                };

                ctx.beginPath();
                if (isStart) {
                    moveTo(x0 - d0, y0 - d0);
                    lineTo(x1 - d1, y1 - d1);
                    lineTo(x1 + d1, y1 + d1);
                    lineTo(x0 - d0, y0 - d0);
                    lineTo(x1 - d1, y1 - d1);
                } else {
                    moveTo(x1 - d1, y1 - d1);
                }

                curveTo(x1 + vx - di, y1 + vy, x2 - d2, y2 - d2, x3 - d3, y3 - d3);

                lineTo(x3 + d3, y3 + d3);
                curveTo(x2 + d2, y2 + d2, x1 + vx + di, y1 + vy + di, x1 + d1, y1 + d1);
                lineTo(x1 - d1, y1 - d1);

                ctx.fill();
                ctx.stroke();
            };

            let ctx = previewCtx;
            ctx.save();
            ctx.fillStyle = lineColor;
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1;//lineWidth;

            console.log(point.clientY - point.y);
            draw(ctx, point.x - point.clientX, point.y - point.clientY);
            ctx.restore();

            lastBuffer = [lastBuffer[lastBuffer.length - 2], point];
            isStart = false;
        };

        const endLine = (evt) => {
            if (!pointersDown[evt.pointerId]) {
                return;
            }

            let point = getPoint(evt);

            continueLine(point);
            previewCanvas.style.display = "none";

            inputArea.releasePointerCapture(evt.pointerId);
            pointersDown[evt.pointerId] = false;

            if (svgPath.length === 0) {
                let w = point.pressure * lineWidth;
                let x = point.x;
                let y = point.y;
                svgPath.push([`M`, [[x - w, y - w]]]);
                svgPath.push([`C`, [[x + w, y + w], [x, y + w], [x - w, y - w]]]);
                svgPath.push([`L`, [[x, y]]]);
            }

            let strokeElem = document.createElement("div");
            let minX, maxX, minY, maxY;

            // Find the minimum, maximum
            for (const [ operation, points ] of svgPath) {
                for (const point of points) {
                    let x = point[0];
                    let y = point[1];

                    if (minX === undefined) {
                        minX = x;
                        minY = y;
                        maxX = x;
                        maxY = y;
                    }

                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }

            const width = maxX - minX + SVG_PADDING * 2.0;
            const height = maxY - minY + SVG_PADDING * 2.0;

            if (!width || !height) {
                return;
            }

            // Translate all points
            const svgPathD = [];

            for (const [ operation, points ] of svgPath) {
                for (const point of points) {
                    point[0] = Math.floor(point[0] - minX + SVG_PADDING);
                    point[1] = Math.floor(point[1] - minY + SVG_PADDING);
                }
            }

            for (const [operation, points] of svgPath) {
                let pointsTxt = [];
                for (const point of points) {
                    pointsTxt.push(point.join(' '));
                }
                svgPathD.push(operation + ' ' + pointsTxt.join(', '));
            }

            strokeElem.style = `
                position: absolute;
                top: ${minY - SVG_PADDING}px;
                left: ${minX - SVG_PADDING}px;
                pointer-events: none;
                z-index: ${Z_IDX_MAGNITUDE - 4};
            `;

            strokeElem.innerHTML = `
            <svg width=${Math.floor(width)} height=${Math.floor(height)}>
            <path d="${svgPathD.join(' ')} Z" stroke="${lineColor}" fill="${lineColor}" />
            </svg>
            `;

            element.appendChild(strokeElem);
        };

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
            endLine(evt);
        });

        inputArea.addEventListener("pointerleave", (evt) => {
            previewCanvas.style.display = "none";

            inputArea.releasePointerCapture(evt.pointerId);
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

        //mainContainer.appendChild(inputArea);
        mainContainer.appendChild(previewCanvas);
        element.appendChild(mainContainer);

        let height = element.clientHeight;
        let main   = document.querySelector("main");

        if (main) {
            height = Math.max(main.clientHeight, height);
        }

        //inputArea.style.height = `${height}px`;
    };

    annotateElement(document.scrollingElement || document.documentElement);

    // Inject CSS
    let cssElem = document.createElement("style");
    cssElem.appendChild(document.createTextNode(CSS));
    document.documentElement.appendChild(cssElem);
})();
}catch(e) { console.error(e); }
