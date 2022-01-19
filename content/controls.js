"use strict";

(function() {

    const CTRLS_Z_INDEX = 4096 * 3;

    const CSS_PREFIX = `__ANNOTATOR_CONTROLS__`;
    const CSS = `
        .${CSS_PREFIX}controlsArea {
            --primary-color-bg: white;
            --secondary-color-bg: #ffeeff;
            --primary-color-fg: #333;
            --secondary-color-fg: #222;

            width: 0;
            height: 0;
            padding: 0;
            margin: 0;
            border: none;
            background: none;
        }

        div.${CSS_PREFIX}toolbox {
            max-width: 50vw;

            /* Some pages set the width of all divs. Override this. */
            width: unset;
            padding: 0;
            margin: 0;

            border-radius: 5px;
            box-shadow: 0 0 3px var(--secondary-color-fg);
            z-index: ${CTRLS_Z_INDEX};

            background: var(--secondary-color-bg);
            color: var(--secondary-color-fg);

            position: fixed;
        }

        div.${CSS_PREFIX}toolbox * {
            width: unset;
            height: unset;
            margin: 0;
            padding: 0;
            box-shadow: none;
        }

        div.${CSS_PREFIX}toolbox > .${CSS_PREFIX}grid {
            display: grid;

            /* 3 columns, each 1/3rd of the total width. */
            grid-template-columns: min-content 1fr min-content;
            gap: 0px;

            max-width: 100%;
            max-height: 100%;
        }

        div.${CSS_PREFIX}toolbox > .${CSS_PREFIX}dialog {
            max-width: 100%;
            padding: 5px;
            display: flex;
            flex-direction: column;

            font: 12pt sans;
        }

        div.${CSS_PREFIX}toolbox > .${CSS_PREFIX}dialog input {
            display: inline-block;
        }

        div.${CSS_PREFIX}toolbox .${CSS_PREFIX}toolbarBtn {
            display: flex;
            flex-direction: column;
            align-items: center;

            background: var(--primary-color-bg);

            padding: 2px;
            margin: 3px;
            border: none;
            box-shadow: 0 -1px 3px var(--secondary-color-fg);
            border-radius: 4px;

            transition: 0.1s transform ease, 0.2s box-shadow ease, 0.3s opacity ease;
        }

        div.${CSS_PREFIX}toolbox .${CSS_PREFIX}toolbarBtn:active {
            transform: scale(1.1, 1.1);
            box-shadow: 0x -1px 5px var(--secondary-color-fg);
            opacity: 0.9;
        }

        div.${CSS_PREFIX}toolbox .${CSS_PREFIX}toolbarBtn:hover {
            box-shadow: 0x -1px 5px var(--secondary-color-fg);
            opacity: 0.8;
        }

        div.${CSS_PREFIX}toolbox .${CSS_PREFIX}toolbarBtn > img {
            flex-grow: 1;
            flex-shrink: 1;
            max-width: inherit;
        }

        div.${CSS_PREFIX}toolbox .${CSS_PREFIX}toolbarBtn > div {
            flex-grow: 1;
            flex-shrink: 1;
            color: var(--primary-color-fg);

            font-size: 12pt;
            font-family: 'Droid Serif', 'Noto Serif', serif;
            font-weight: bold;
            letter-spacing: -1pt;
        }

        div.${CSS_PREFIX}toolbox .${CSS_PREFIX}backBtn {
            display: inline-block;
            color: var(--primary-color-fg);
            background: var(--primary-color-bg);
            border: 1px solid var(--primary-color-fg);

            border-radius: 2px;
            padding: 3px;

            flex-grow: 0;
        }

        div.${CSS_PREFIX}toolbox label {
            display: inline;
        }

        @media print {
            .${CSS_PREFIX}toolbox {
                display: none;
            }
        }

        @media (prefers-color-scheme: dark) {
            div.${CSS_PREFIX}toolbox {
                --primary-color-bg: #444;
                --secondary-color-bg: #434;
                --primary-color-fg: white;
                --secondary-color-fg: white;
            }
        }
    `;

    /**
     * @param condition (bool) Throws an error if !condition
     * @param description (String) Description printed if the assertion fails.
     */
    function assert(condition, description) {
        if (!condition) {
            console.error(`Assertion failed: ${description || 'No description'}.`);
            throw new Error(description || "No description");
        }
    }

    /**
     * Convert an integer to a hex string.
     * @param number Integer
     * @param padToLength Integer, optional
     */
    function toHex(number, padToLength) {
        let result = [];

        const conversionTable = {
            10: 'a',
            11: 'b',
            12: 'c',
            13: 'd',
            14: 'e',
            15: 'f',
        };

        for (; number > 0; number = Math.floor(number / 16)) {
            let digit = number % 16;

            if (digit >= 0 && digit <= 9) {
                result.push(`${digit}`);
            } else {
                result.push(`${conversionTable[digit]}`);
            }
        }

        if (padToLength !== undefined) {
            while (result.length < padToLength) {
                result.push(`0`);
            }
        }

        result.reverse();

        return result.join('');
    }

    /** Convert from an (unprefixed) hex string to an integer. */
    function fromHex(text) {
        return parseInt(`0x${text}`);
    }

    assert(toHex(5) == 5, `toHex(5) failed`);
    assert(toHex(15) == 'f', `toHex(0xf) failed`);
    assert(toHex(0xfeedab3) == 'feedab3', `toHex(0xfeedab3) failed`);

    /**
     * Convert a hex or rgb/rgba color to an (r, g, b, a) quadruple.
     * Each component ranges from 0 to 255.
     */
    function colorToQuadruple(color) {
        // If already a quadruple
        if (typeof (color) == "object") {
            return [ color[0], color[1], color[2], color[3] !== undefined ? color[3] : 255 ];
        }

        const nameToQuadrupleTable = {
            red: [ 255, 0, 0, 255 ],
            green: [ 0, 255, 0, 255 ],
            blue: [ 0, 0, 255, 255 ],
            white: [ 255, 255, 255, 255 ],
            black: [ 0, 0, 0, 255 ],
            gray: [ 100, 100, 100, 255 ],
            yellow: [ 255, 255, 0, 255 ],
            purple: [ 255, 0, 255, 255 ],
            orange: [ 255, 200, 50, 255 ],
        };

        if (nameToQuadrupleTable[color]) {
            return nameToQuadrupleTable[color];
        }

        if (color.length == 0) {
            return nameToQuadrupleTable.black;
        }

        // Color in the form #ff0000
        if (color.charAt(0) == '#') {
            let r, g, b, a = 255;

            // #rgb
            if (color.length === 4) {
                r = fromHex(color.charAt(1)) * 16;
                g = fromHex(color.charAt(2)) * 16;
                b = fromHex(color.charAt(3)) * 16;
            } // #argb
            else if (color.length === 5) {
                r = fromHex(color.charAt(1)) * 16;
                g = fromHex(color.charAt(2)) * 16;
                b = fromHex(color.charAt(3)) * 16;
                a = fromHex(color.charAt(4)) * 16;
            } // #rrggbb
            else if (color.length === 7) {
                r = fromHex(color.substr(1, 2));
                g = fromHex(color.substr(3, 2));
                b = fromHex(color.substr(5, 2));
            } // #aarrggbb
            else if (color.length === 9) {
                r = fromHex(color.substr(1, 2));
                g = fromHex(color.substr(3, 2));
                b = fromHex(color.substr(5, 2));
                a = fromHex(color.substr(7));
            }
            else {
                throw new Error("Invalid color");
            }

            return [ r, g, b, a ];
        }
        else if (color.startsWith('rgb')) {
            let expectedComponents = 3;
            let startIdx = 'rgb('.length;

            if (color.startsWith('rgba(')) {
                expectedComponents = 4;
                startIdx = 'rgba('.length;
            }

            let parts = color.substring(startIdx, color.length - 1).split(',');
            let result = [];
            for (const part of parts) {
                result.push(Math.floor(parseFloat(part)));
            }
            assert(result.length === expectedComponents, `Given color has wrong number of components.`);

            if (result.length == 3) {
                result.push(255);
            }

            return result;
        }
        else {
            throw new Error("Invalid color");
        }
    }

    assert(colorToQuadruple('red').join(',') == '255,0,0,255', 'Red -> quadruple failed');
    assert(colorToQuadruple('#fed').join(',') == '240,224,208,255', 'Pinkish -> quadruple failed');
    assert(colorToQuadruple('#fed0').join(',') == '240,224,208,0', 'Pinkish but clear -> quadruple failed');
    assert(colorToQuadruple('#ffeedd').join(',') == '255,238,221,255', 'Pinkish (2) -> quadruple failed');
    assert(colorToQuadruple('#ffffff00').join(',') == '255,255,255,0', 'Clear white -> quadruple failed');
    assert(colorToQuadruple('rgb(255, 0, 10)').join(',') == '255,0,10,255', 'rgb( -> quadruple failed');
    assert(colorToQuadruple('rgba(1, 2, 3, 4)').join(',') == '1,2,3,4', 'rgba( -> quadruple failed');

    /**
     * Convert an (r, g, b, a) tuple to an ARGB hex string.
     * R, G, B, A should each range from 0 to 255 (inclusive).
     *
     * E.g. (255, 0, 0, 255) -> ff0000ff;
     */
    function quadrupleToHex(r, g, b, a) {
        // If we were called with quadrupleToHex([ r, g, b, a ])...
        if (typeof (r) == typeof ([ 1, 2, 3, 4 ])) {
            let quad = r;
            r = quad[0];
            g = quad[1];
            b = quad[2];
            a = quad[3];
        }

        return `${toHex(r, 2)}${toHex(g, 2)}${toHex(b, 2)}${toHex(a, 2)}`;
    }

    /**
     * Create a color chooser.
     * @return {
     *  addTo(HTMLElement): Add the color chooser to the given element.
     * }
     */
    function makeColorChooser(initialColor, onChange) {
        let onUpdate;
        const fullContainer = document.createElement(`div`);
        const colorDisplay = document.createElement('div');
        try {
            initialColor = colorToQuadruple(initialColor);
        } catch(e) {
            console.warn("Color parse error", e);
            initialColor = [255, 0, 0, 255];
        }

        colorDisplay.style = `
            padding: 5px;
            border-raduis: 10px;
            box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
        `;

        const createSlider = (id, labelText, value) => {
            let sliderContainer = document.createElement("div");
            let slider = document.createElement("input");
            let label = document.createElement("label");
            slider.id = `${CSS_PREFIX}${id}`;
            slider.type = "range";
            slider.min = 0;
            slider.max = 255;
            slider.step = 1;

            label.appendChild(document.createTextNode(labelText));
            label[`for`] = slider.id;

            slider.value = value;

            slider.ondblclick = () => {
                if (slider.type == "range") {
                    slider.type = "number";
                }
                else {
                    slider.type = "range";
                }
            };
            slider.oninput = slider.onchange = () => onUpdate();

            fullContainer.appendChild(sliderContainer);
            sliderContainer.appendChild(label);
            sliderContainer.appendChild(slider);

            return {
                getValue() {
                    return Math.floor(parseFloat(slider.value));
                },
            };
        };

        const updateDisplay = (color) => {
            let colorStr = '#' + quadrupleToHex(color);
            let foregroundColor = [ 255 - color[0], 255 - color[1], 255 - color[2], 255 ];
            let fgBgContrast = Math.abs((color[0] + color[1] + color[2]) / 255 / 3
                                        - (foregroundColor[0] + foregroundColor[1] + foregroundColor[2]) / 255 / 3);

            colorDisplay.replaceChildren(document.createTextNode(colorStr));

            // Ensure we have enough contrast for the foreground to be legible.
            if (fgBgContrast < 0.2) {
                foregroundColor = [ 0, 0, 0, 255 ];
            }

            // Inverse of the color
            colorDisplay.style.color = '#' + quadrupleToHex( foregroundColor );
            colorDisplay.style.backgroundColor = colorStr;
        };

        const sliders = {
            r: createSlider('redslider', 'Red', initialColor[0]),
            g: createSlider('greenslider', 'Green', initialColor[1]),
            b: createSlider('blueslider', 'Blue', initialColor[2]),
            a: createSlider('opacityslider', 'Opacity', initialColor[3]),
        };

        const getColor = () => {
            return [ sliders.r.getValue(), sliders.g.getValue(), sliders.b.getValue(), sliders.a.getValue() ];
        };

        onUpdate = () => {
            let color = getColor();
            updateDisplay(color);
            onChange('#' + quadrupleToHex(color));
        };

        fullContainer.appendChild(colorDisplay);
        updateDisplay(getColor());

        return {
            addTo(elem) {
                elem.appendChild(fullContainer);
            },
        };
    }

    /**
     * Make [target] draggable
     *
     * @param target HTMLElement The target of drag/drop gestures
     * @param onDrag void(dx, dy) Called when the given target is dragged by (dx, dy) pixels.
     * @param onDragStart void(startX, startY)
     * @param onDragEnd void(fullDx, fullDy) Called when the user stops dragging the element, with the full change
     *                                       in (x, y) position over the entire drag.
     * @return {
     *  endDrag: void(void) Clean up, stop dragging the target
     * }
     */
    function makeDraggable(target, onDrag, onDragStart, onDragEnd) {
        // Minimum number of pixels the pointer has to move to start a drag.
        const DRAG_START_THRESHOLD = 5;

        let endingDrag = false;
        let dragging = false;
        let preDrag = false;
        let lastPos = [];
        let startPos = [];

        onDragStart = onDragStart || (() => {});
        onDragEnd = onDragEnd || (() => {});

        const getPos = (evt) => [ evt.screenX, evt.screenY ];
        const getDelta = (evt) => [ evt.screenX - lastPos[0], evt.screenY - lastPos[1] ];

        target.style.touchAction = 'pinch-zoom';

        const handlePtrDown = (evt) => {
            target.setPointerCapture(evt.pointerId);
            dragging = false;
            lastPos = getPos(evt);
            evt.preventDefault();

            startPos = [lastPos[0], lastPos[1]];
            preDrag = true;
        };

        const handlePtrMove = (evt) => {
            let pos = getPos(evt);

            // If we've moved far enough to start dragging,
            if (preDrag && Math.hypot(pos[0] - startPos[0], pos[1] - startPos[1]) >= DRAG_START_THRESHOLD) {
                preDrag = false;
                dragging = true;
                onDragStart(startPos[0], startPos[1]);
            }

            if (dragging) {
                evt.preventDefault();
                let del = getDelta(evt);
                onDrag(del[0], del[1]);

                lastPos = pos;
            }
        };

        let cleanupPtrEndEvents;

        const handlePtrEnd = (evt) => {
            target.releasePointerCapture(evt.pointerId);
            evt.preventDefault();

            if (endingDrag) {
                cleanupPtrEndEvents();
            }

            if (dragging) {
                requestAnimationFrame(() => onDragEnd(evt.screenX - startPos[0], evt.screenY - startPos[1]));
            }

            dragging = false;
            preDrag = false;
        };


        target.addEventListener("pointerdown", handlePtrDown);
        target.addEventListener("pointermove", handlePtrMove);
        target.addEventListener("pointercancel", handlePtrEnd);
        target.addEventListener("pointerup", handlePtrEnd);

        cleanupPtrEndEvents = () => {
            target.removeEventListener("pointercancel", handlePtrEnd);
            target.removeEventListener("pointerup", handlePtrEnd);
        };

        return {
            endDrag: () => {
                target.removeEventListener("pointerdown", handlePtrDown);
                target.removeEventListener("pointermove", handlePtrMove);

                // If a drag is currently in progress, allow it to finish
                if (dragging) {
                    endingDrag = true;
                } else {
                    cleanupPtrEndEvents();
                }
            },
        };
    }

    /**
    * Represents a toobar button.
    * @param text (String) Short text label for the action
    * @param iconPath (String) Name of the icon file (e.g. for `icons/toolbar/foo.svg`, iconPath=`foo.svg`).
    * @param action (function, optional) Called when the item is clicked.
    */
    function ToolItem(text, iconPath, action) {
        action = action || (() => {});

        this.containerElem_ = document.createElement(`button`);
        this.iconElem_ = document.createElement("img");
        this.descriptionElem_ = document.createElement(`div`);
        this.parent_ = null;
        this.endDrag_ = null;
        this.justDragged_ = false;

        this.iconElem_.src = chrome.runtime.getURL(`icons/toolbar/${iconPath}`);
        this.iconElem_.alt = "";

        this.descriptionElem_.appendChild(document.createTextNode(text));

        this.containerElem_.onclick = () => {
            if (!this.justDragged_) {
                action.call(this);
            }
        };

        this.containerElem_.appendChild(this.iconElem_);
        this.containerElem_.appendChild(this.descriptionElem_);

        this.containerElem_.classList.add(`${CSS_PREFIX}toolbarBtn`);
    }

    /**
    * Set whether this is draggable.
    * @param draggable true iff this should be draggable
    * @param onDrag if draggable, call this function with (dx, dy) in pixels.
    */
    ToolItem.prototype.setDraggable = function(draggable, onDrag) {
        // If our draggable-ness is already as desired...
        if (this.endDrag_ && draggable || !this.endDrag_ && !draggable) {
            return;
        }

        // Otherwise, we're toggling dragableness
        if (this.endDrag_) {
            this.endDrag_();
            this.endDrag_ = null;
        } else {
            this.endDrag_ = makeDraggable(this.containerElem_, (dx, dy) => {
                onDrag(dx, dy);
                this.justDragged_ = true;
            }, () => { // dragStart
                this.justDragged_ = true;
            }, () => { // dragStop
                this.justDragged_ = false;
            });
        }
    };

    /**
    * Adds the ToolItem to the given parent. Can
    * only be called once for each tool item.
    */
    ToolItem.prototype.appendTo = function(parent) {
        assert(this.parent_ == null);
        parent.appendChild(this.containerElem_);
        this.parent_ = parent;
    };

    /**
     * If this is visible, hides this, otherwise, shows this.
     */
    ToolItem.prototype.toggleVisible = function() {
        let target = this.containerElem_;

        if (target.style.display == "none") {
            target.style.display = "";
        } else {
            target.style.display = "none";
        }
    };

    /**
    * Constructs a draggable toolbox.
    */
    function ToolboxBuilder() {
        this.containerElem_ = document.createElement("div");
        this.gridElem_ = document.createElement("div");
        this.dialogElem_ = document.createElement("div");

        // Styles
        this.containerElem_.classList.add(`${CSS_PREFIX}toolbox`);
        this.gridElem_.classList.add(`${CSS_PREFIX}grid`);
        this.dialogElem_.classList.add(`${CSS_PREFIX}dialog`);

        this.grid_ = [
            [ null, null, null ],
            [ null, null, null ],
            [ null, null, null ],
        ];

        this.toggleExpanded_ = null;

        this.dragger_ = new ToolItem("Show/hide Toolbox", "toolbox.svg", () => {
            this.toggleExpanded_();
        });
        this.grid_[1][1] = this.dragger_;
        this.nextRowIdx_ = 0;
        this.nextColIdx_ = 0;

        this.containerElem_.appendChild(this.gridElem_);
        this.containerElem_.appendChild(this.dialogElem_);
    }

    /**
    * @param item ToolItem The item to add to this.
    */
    ToolboxBuilder.prototype.addItem = function(item) {
        assert(this.grid_[this.nextRowIdx_], "No remaining rows!");

        while (this.grid_[this.nextRowIdx_][this.nextColIdx_]) {
            this.nextColIdx_ ++;

            if (this.nextColIdx_ >= this.grid_[this.nextRowIdx_].length) {
                this.nextColIdx_ = 0;
                this.nextRowIdx_ ++;
            }
        }
        this.grid_[this.nextRowIdx_][this.nextColIdx_] = item;

        return this;
    };

    ToolboxBuilder.prototype.build = function() {
        let currentPos = [50, 50];
        const container = this.containerElem_;
        const gridContainer = this.gridElem_;
        const dialogContainer = this.dialogElem_;
        let toolbox;
        let dialogBackArrowContainer;

        let onDrag;

        dialogContainer.style.display = "none";

        /// Creates a button that cancels the dialog and returns to
        /// the toolbox view.
        const createDialogTitlebar = () => {
            let container = document.createElement("div");
            let backBtn = document.createElement('button');
            let dragBar = document.createElement('div');

            // TODO: Test this back button with screen readers
            backBtn.appendChild(document.createTextNode(`←`));

            backBtn.classList.add(`${CSS_PREFIX}backBtn`);
            container.style.display = `flex`;
            container.style.flexDirection = `row`;
            dragBar.style.flexGrow = 1;
            backBtn.style.flexGrow = 0;

            backBtn.onclick = () => toolbox.showToolbox();

            makeDraggable(dragBar, onDrag);

            container.appendChild(backBtn);
            container.appendChild(dragBar);
            return container;
        };

        const makeDraggablePadding = () => {
            let padding = document.createElement('div');
            padding.style.flexGrow = 10;
            padding.style.flexShrink = 10;
            makeDraggable(padding, onDrag);

            return padding;
        };

        /// Update the position of the toolbox based on the contents
        /// of [currentPos].
        const updatePos = () => {
            let x = currentPos[0];
            let y = currentPos[1];

            x -= container.clientWidth / 2 / window.innerWidth * 100;
            y -= container.clientHeight / 2 / window.innerHeight * 100;

            this.containerElem_.style.left = `${Math.floor(10 * x + 0.5) / 10}vw`;
            this.containerElem_.style.top = `${Math.floor(10 * y + 0.5) / 10}vh`;
        };

        /// Move the toolbox by (dx, dy) in units of (vw, vh)
        const moveBy = (dx, dy) => {
            currentPos[0] = Math.max(0, Math.min(100, currentPos[0] + dx));
            currentPos[1] = Math.max(0, Math.min(100, currentPos[1] + dy));

            updatePos();
        };

        onDrag = (dx, dy) => {
            // Convert to (vw, vh) units
            moveBy(dx / window.innerWidth * 100, dy / window.innerHeight * 100);
        };

        this.dragger_.setDraggable(true, onDrag);

        this.toggleExpanded_ = () => {
            for (let row of this.grid_) {
                for (let elem of row) {
                    if (elem != this.dragger_) {
                        elem.toggleVisible();
                    }
                }
            }

            requestAnimationFrame(() => updatePos());
        };

        for (let y = 0; y < this.grid_.length; y++) {
            for (let x = 0; x < this.grid_[y].length; x++) {
                let item = this.grid_[y][x];
                if (!item) {
                    item = new ToolItem("Not Given", "none.svg");
                    this.grid_[y][x] = item;
                }

                item.appendTo(gridContainer);
            }
        }

        requestAnimationFrame(() => updatePos());

        dialogBackArrowContainer = createDialogTitlebar();

        // Return the toolbox:
        toolbox = {
            container: container,
            dialogContainer: dialogContainer,

            /// Show [elem] as a dialog, (temporarily replace the toolbox grid)
            showDialog: (elem) => {
                dialogContainer.replaceChildren(dialogBackArrowContainer, elem, makeDraggablePadding());

                // Make the dialog roughly the size of the grid
                dialogContainer.style.width = `${gridContainer.clientWidth}px`;
                dialogContainer.style.height = `${gridContainer.clientHeight}px`;

                dialogContainer.style.display = "";
                gridContainer.style.display = "none";
            },

            /// Hide the dialog and show the toolbox grid.
            showToolbox: () => {
                // Empty the dialog & hide it.
                dialogContainer.replaceChildren();
                dialogContainer.style.display = "none";
                gridContainer.style.display = "";
            },
        };

        return toolbox;
    };

    if (window.__ANNOTATOR_CTRL_SCRIPT_INJECTED) {
        return;
    }
    window.__ANNOTATOR_CTRL_SCRIPT_INJECTED = true;


    let controlsContainer = document.createElement("div");
    let toolbox;
    let toolColor, toolThickness, touchDrawEnabled;

    toolbox = new ToolboxBuilder()
        .addItem(new ToolItem("Eraser Tool", "eraser.svg", () => {
            alert('not implemented');
            sendMessage({
                command: "setDrawingMode",
                value: "eraser",
                forward: true,
            });
        }))
        .addItem(new ToolItem("Mouse Tool", "mouse.svg", () => {
            sendMessage({
                command: "setDrawingMode",
                value: "mouse",
                forward: true,
            });
        }))
        .addItem(new ToolItem("Calligraphic Pen", "calligraphy.svg", () => {
            sendMessage({
                command: "setDrawingMode",
                value: "calligraphy",
                forward: true,
            });
        }))
        .addItem(new ToolItem("Set Color", "setColor.svg", () => {
            const container = document.createElement('div');
            const colorChooser = makeColorChooser(toolColor, (color) => {
                toolColor = color;

                sendMessage({
                    command: "setToolColor",
                    value: toolColor,
                    forward: true,
                });
            });

            colorChooser.addTo(container);
            toolbox.showDialog(container);
        }))
        .addItem(new ToolItem("Set Thickness", "setThickness.svg", () => {
            toolThickness = toolThickness || 0.5;

            const container = document.createElement('div');
            const firstRow = document.createElement('div');
            const secondRow = document.createElement('div');

            const labelElem = document.createElement('label');
            const thicknessSlider = document.createElement('input');
            const previewCanvas = document.createElement('canvas');

            thicknessSlider.id = `${CSS_PREFIX}thicknessSlider`;
            labelElem[`for`] = thicknessSlider.id;
            thicknessSlider.min = 0.1;
            thicknessSlider.max = 30;
            thicknessSlider.step = 0.1;
            thicknessSlider.type = "range";
            thicknessSlider.value = toolThickness;

            previewCanvas.style.display = 'block';
            previewCanvas.style.maxWidth = '300px';
            previewCanvas.style.height = '80px';
            previewCanvas.style.width = '100%';
            previewCanvas.style.marginLeft = 'auto';
            previewCanvas.style.marginRight = 'auto';
            previewCanvas.style.backgroundColor = 'white';
            previewCanvas.style.borderRadius = "5px";

            labelElem.appendChild(document.createTextNode(`Thickness:`));

            const updatePreview = () => {
                const ctx = previewCanvas.getContext('2d');

                // Resize the preview, if necessary
                if (ctx.canvas.width != ctx.canvas.clientWidth || ctx.canvas.height != ctx.canvas.clientHeight) {
                    ctx.canvas.width = ctx.canvas.clientWidth;
                    ctx.canvas.height = ctx.canvas.clientHeight;
                }

                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

                ctx.beginPath();
                ctx.moveTo(ctx.canvas.width / 8, ctx.canvas.height / 2);
                ctx.bezierCurveTo(ctx.canvas.width / 3, ctx.canvas.height / 8,
                                  ctx.canvas.width / 2, ctx.canvas.height * 7 / 8,
                                  ctx.canvas.width * 7 / 8, ctx.canvas.height * 5 / 8);
                ctx.lineTo(ctx.canvas.width * 7 / 8, ctx.canvas.height * 5 / 8);

                ctx.lineCap = "round";
                ctx.lineWidth = toolThickness;
                ctx.stroke();
            };

            thicknessSlider.ondblclick = () => {
                thicknessSlider.type = thicknessSlider.type === "range" ? "number" : "range";
            };

            thicknessSlider.onchange = thicknessSlider.oninput = () => {
                toolThickness = parseFloat(thicknessSlider.value);
                updatePreview();

                sendMessage({
                    command: "setToolThickness",
                    value: toolThickness,
                    forward: true,
                });
            };

            firstRow.appendChild(labelElem);
            firstRow.appendChild(thicknessSlider);
            secondRow.appendChild(previewCanvas);

            container.appendChild(firstRow);
            container.appendChild(secondRow);
            toolbox.showDialog(container);

            updatePreview();
        }))
        .addItem(new ToolItem("Pencil", "pencil.svg", () => {
            alert('not implemented');
            sendMessage({
                command: "setDrawingMode",
                value: "pencil",
                forward: true,
            });
        }))
        .addItem(new ToolItem("Marker", "todo.svg", () => {
            alert('not implemented');
            sendMessage({
                command: "setDrawingMode",
                value: "marker",
                forward: true,
            });
        }))
        .addItem(new ToolItem("More", "todo.svg", () => {
            const container = document.createElement("div");
            const labelElem = document.createElement("label");
            const touchDrawingCheckbox = document.createElement("input");
            const firstRow = document.createElement("div");

            touchDrawingCheckbox.id = `${CSS_PREFIX}touchDrawingCheckbox`;
            touchDrawingCheckbox.type = 'checkbox';
            labelElem['for'] = touchDrawingCheckbox.id;

            labelElem.appendChild(document.createTextNode(`Enable Touch Drawing`));
            touchDrawingCheckbox.checked = touchDrawEnabled;

            touchDrawingCheckbox.onchange = touchDrawingCheckbox.oninput = () => {
                touchDrawEnabled = touchDrawingCheckbox.checked;
                sendMessage({
                    command: "setTouchDrawEnabled",
                    value: touchDrawEnabled,
                    forward: true,
                });
            };

            firstRow.replaceChildren(touchDrawingCheckbox, labelElem);
            container.appendChild(firstRow);
            toolbox.showDialog(container);
        }))
        .build();
    let controls = toolbox.container;

    const injectCSS = () => {
        let elem = document.createElement("style");
        elem.innerText = CSS;
        document.body.appendChild(elem);
    };

    const sendMessage = (message) => {
        chrome.runtime.sendMessage(undefined, message);
    };

    chrome.runtime.onMessage.addListener((message) => {
        if (message.command === "setToolThickness") {
            toolThickness = parseFloat(message.value);
        } else if (message.command === "setToolColor") {
            toolColor = message.value;
        } else if (message.command === "setTouchDrawEnabled") {
            touchDrawEnabled = message.value;
        }
    });

    // Wrap the toolbox in an additional <div></div>: We can set CSS variables
    // on the enclosing div that affect controls and its children.
    controlsContainer.classList.add(`${CSS_PREFIX}controlsArea`);
    controls.classList.add(`${CSS_PREFIX}controls`);
    controls.classList.add(`__ANNOTATOR_CTRLS`);
    controlsContainer.appendChild(controls);
    document.documentElement.appendChild(controlsContainer);

    injectCSS();
})();
