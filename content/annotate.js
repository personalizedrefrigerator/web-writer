"use strict";

// Begin namespace
(async () => {
    // Canvas height: 1024 px at maximum.
    const CANVAS_MAX_HEIGHT = 256;
    const CSS_PREFIX = `_ANNOTATOR__`;
    const Z_IDX_MAGNITUDE = 4096;
    const SVG_PADDING = 35;
    const CONTAINER_ELEMS = {
        "div": true,
        "span": true,
        "h1": true,
        "h2": true,
        "h3": true,
        "h4": true,
        "h5": true,
        "h6": true,
        "th": true,
        "td": true,
        "b": true,
        "a": true,
        "strong": true,
        "i": true,
        "emph": true,
        "article": true,
        "blockquote": true,
        "main": true,
        "header": true,
        "footer": true,
        "body": true
    };
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
            pointer-events: none;

            z-index: ${Z_IDX_MAGNITUDE};
        }

        .${CSS_PREFIX}noTouchScroll, .${CSS_PREFIX}noTouchScroll * {
            touch-action: pinch-zoom !important;
        }

        :not(.${CSS_PREFIX}noTouchScroll) .${CSS_PREFIX}strokeElem {
            pointer-events: none;
        }

        .${CSS_PREFIX}strokeElem {
            overflow: visible;
            width: 0;
            height: 0;
            padding: 0;
            margin: 0;
            position: relative;
            z-index: ${Z_IDX_MAGNITUDE - 4};
        }

        .${CSS_PREFIX}strokeElem > svg {
            position: absolute;
            top: 0;
            left: 0;
            max-width: unset !important;
            height: auto;
            width: auto;
        }
    `;

    // Don't re-inject
    if (document.querySelector(`.${CSS_PREFIX}previewCanvas`)) {
        console.log("Already running!");
        return;
    }

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
        let inputArea = element;
        let previewCanvas = document.createElement("canvas");
        let previewCtx = previewCanvas.getContext('2d');
        let startElem = null;
        let acceptingInput = true;
        let pointersDown = {};
        let lastBuffer = [];
        let lineColor = "red";
        let lineWidth = 2;
        let pointerDownCount = 0;
        let svgPaths = [];

        mainContainer.classList.add(`${CSS_PREFIX}mainContainer`);
        previewCanvas.classList.add(`${CSS_PREFIX}previewCanvas`);

        const getPoint = (evt) => {
            let x = evt.offsetX;
            let y = evt.offsetY;

            return {
                x: x, y: y,
                clientX: evt.clientX, clientY: evt.clientY,
                pageX: evt.pageX, pageY: evt.pageY,
                t: (new Date()).getTime(),

                pressure: Math.min(Math.max(0.1, (evt.pressure || 0.6) + 0.1), 2.0),
            };
        };

        let isStart = false;
        const startLine = (point, evt) => {
            previewCanvas.style.display = "block";
            resizeCanvas(previewCanvas);
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

            lastBuffer = [];
            isStart = true;
            svgPaths = [];
            startElem = evt.target;
        };

        const continueLine = (point) => {
            lastBuffer.push(point);
            if (lastBuffer.length < 4) {
                return;
            }

            const draw = (ctx, ctxX, ctxY) => {
                let svgPath = [];

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

                let dt = Math.max(p1.t - p0.t, 0.1);
                let vx = (x1 - x0) / dt;
                let vy = (y1 - y0) / dt;

                vx *= 0.5 * dt;
                vy *= 0.5 * dt;

                const moveTo = (x, y) => {
                    ctx.moveTo(x - ctxX, y - ctxY);
                    svgPath.push([`M`, [[x, y]]]);
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

                curveTo(x1 + vx - di, y1 + vy - di, x2 - d2, y2 - d2, x3 - d3, y3 - d3);

                lineTo(x3 + d3, y3 + d3);
                curveTo(x2 + d2, y2 + d2, x1 + vx + di, y1 + vy + di, x1 + d1, y1 + d1);
                lineTo(x1 - d1, y1 - d1);

                ctx.fill();
                ctx.stroke();
                svgPaths.push(svgPath);
            };

            let ctx = previewCtx;
            ctx.save();
            ctx.fillStyle = lineColor;
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1;

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

            inputArea.releasePointerCapture(evt.pointerId);
            pointersDown[evt.pointerId] = false;

            if (svgPaths.length === 0) {
                let svgPath = [];

                let w = point.pressure * lineWidth;
                let x = point.x;
                let y = point.y;
                svgPath.push([`M`, [[x - w, y - w]]]);
                svgPath.push([`C`, [[x + w, y + w], [x, y + w], [x - w, y - w]]]);
                svgPath.push([`L`, [[x, y]]]);

                svgPaths.push(svgPath);
            }

            let strokeElem = document.createElement("div");
            let minX, maxX, minY, maxY;

            // Find the minimum, maximum
            for (const svgPath of svgPaths) {
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
            }

            const width = maxX - minX + SVG_PADDING * 2.0;
            const height = maxY - minY + SVG_PADDING * 2.0;

            if (!width || !height) {
                return;
            }

            const svgPathText = [];

            for (const svgPath of svgPaths) {
                const svgPathD = [];

                // Translate all points
                for (const [ operation, points ] of svgPath) {
                    for (const point of points) {
                        point[0] = Math.floor((point[0] - minX + SVG_PADDING) * 10.0 + 0.5) / 10.0;
                        point[1] = Math.floor((point[1] - minY + SVG_PADDING) * 10.0 + 0.5) / 10.0;
                    }
                }

                for (const [operation, points] of svgPath) {
                    let pointsTxt = [];
                    for (const point of points) {
                        pointsTxt.push(point.join(' '));
                    }
                    svgPathD.push(operation + ' ' + pointsTxt.join(', '));
                }

                svgPathText.push(`<path d="${svgPathD.join(' ')} Z" stroke="${lineColor}" fill="${lineColor}"/>`);
            }

            const getSvgOffset = () => {
                let bbox = strokeElem.getBoundingClientRect();
                let startElemPos = { x: bbox.left + window.scrollX, y: bbox.top + window.scrollY };

                return [ minX - SVG_PADDING - startElemPos.x, minY - SVG_PADDING - startElemPos.y ];
            };

            strokeElem.classList.add(`${CSS_PREFIX}strokeElem`);
            strokeElem.style.opacity = 0;
            strokeElem.innerHTML = `
            <svg width=${Math.floor(width)} height=${Math.floor(height)}>
            ${svgPathText.join("")}
            </svg>
            `;

            let potentialParent = startElem;
            let relativeChild = startElem;

            while (potentialParent && !CONTAINER_ELEMS[potentialParent.tagName.toLowerCase()]) {
                relativeChild = potentialParent;
                potentialParent = potentialParent.parentElement;
            }

            if (potentialParent && CONTAINER_ELEMS[potentialParent.tagName.toLowerCase()]) {
                if (relativeChild !== potentialParent) {
                    potentialParent.insertBefore(strokeElem, relativeChild);
                }
                else {
                    potentialParent.appendChild(strokeElem);
                }
            }
            else {
                element.appendChild(strokeElem);
            }

            // After layout,
            setTimeout(() => {
                // Find out how much we need to move the stroke
                let bbox = strokeElem.getBoundingClientRect();
                let pos = { x: bbox.left + window.scrollX, y: bbox.top + window.scrollY };
                let wantedPos = { x: minX - SVG_PADDING, y: minY - SVG_PADDING };
                let top = wantedPos.y - pos.y;
                let left = wantedPos.x - pos.x;

                strokeElem.style.top = top + "px";
                strokeElem.style.left = left + "px";

                // Show the new stroke, hide the preview
                strokeElem.style.opacity = 1;
                previewCanvas.style.display = "none";
            });
        };

        const shouldIgnoreEvent = (evt) => {
            if (!acceptingInput) {
                return true;
            }

            // Don't annotate controls!
            for (let elem = evt.target; elem; elem = elem.parentElement) {
                if (elem.classList.contains("__ANNOTATOR_CTRLS")) {
                    return true;
                }
            }

            return false;
        };

        const setTouchScrolls = (scrolls) => {
            if (!scrolls) {
                inputArea.classList.add(`${CSS_PREFIX}noTouchScroll`);
                document.documentElement.classList.add(`${CSS_PREFIX}noTouchScroll`);
            } else {
                inputArea.classList.remove(`${CSS_PREFIX}noTouchScroll`);
                document.documentElement.classList.remove(`${CSS_PREFIX}noTouchScroll`);
            }
        };

        inputArea.addEventListener("pointerdown", (evt) => {
            if (shouldIgnoreEvent(evt)) {
                return;
            }

            inputArea.setPointerCapture(evt.pointerId);

            evt.preventDefault();
            startLine(getPoint(evt), evt);

            pointersDown[evt.pointerId] = true;
        });

        inputArea.addEventListener("pointermove", (evt) => {
            if (shouldIgnoreEvent(evt)) {
                return;
            }

            if (pointersDown[evt.pointerId] && evt.isPrimary) {
                evt.preventDefault();
                continueLine(getPoint(evt));
            }
        });

        inputArea.addEventListener("pointerup", (evt) => {
            if (shouldIgnoreEvent(evt)) {
                return;
            }

            evt.preventDefault();
            endLine(evt);
        });

        inputArea.addEventListener("pointerleave", (evt) => {
            if (shouldIgnoreEvent(evt)) {
                return;
            }

            previewCanvas.style.display = "none";

            inputArea.releasePointerCapture(evt.pointerId);
            pointersDown[evt.pointerId] = false;
        });

        inputArea.addEventListener("click", (evt) => {
            if (shouldIgnoreEvent(evt)) {
                return;
            }

            evt.preventDefault();
            endLine(evt);
        });



        chrome.runtime.onMessage.addListener((message) => {
            if (message.command === "setToolThickness") {
                lineWidth = message.value;
            } else if (message.command === "setToolColor") {
                lineColor = message.value;
            } else if (message.command === "setDrawingMode") {
                acceptingInput = message.value;
                setTouchScrolls(!acceptingInput);
            }
        });

        mainContainer.appendChild(previewCanvas);
        element.appendChild(mainContainer);
        setTouchScrolls(false);
    };

    annotateElement(document.scrollingElement || document.documentElement);

    // Inject CSS
    let cssElem = document.createElement("style");
    cssElem.appendChild(document.createTextNode(CSS));
    document.documentElement.appendChild(cssElem);
})();
