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

            font: 12pt sans;
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
        let endingDrag = false;
        let dragging = false;
        let lastPos = [];
        let startPos = [];

        onDragStart = onDragStart || (() => {});
        onDragEnd = onDragEnd || (() => {});

        const getPos = (evt) => [ evt.screenX, evt.screenY ];
        const getDelta = (evt) => [ evt.screenX - lastPos[0], evt.screenY - lastPos[1] ];

        const handlePtrDown = (evt) => {
            target.setPointerCapture(evt.pointerId);
            dragging = true;
            lastPos = getPos(evt);
            evt.preventDefault();
            startPos = [lastPos[0], lastPos[1]];

            onDragStart(lastPos[0], lastPos[1]);
        };

        const handlePtrMove = (evt) => {
            if (dragging) {
                evt.preventDefault();
                let del = getDelta(evt);
                onDrag(del[0], del[1]);

                lastPos = getPos(evt);
            }
        };

        let cleanupPtrEndEvents;

        const handlePtrEnd = (evt) => {
            target.releasePointerCapture(evt.pointerId);
            evt.preventDefault();

            if (endingDrag) {
                cleanupPtrEndEvents();
            }
            dragging = false;

            onDragEnd(evt.screenX - startPos[0], evt.screenY - startPos[1]);
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
            }, () => {
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
                dialogContainer.replaceChildren(dialogBackArrowContainer, elem);

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
    toolbox = new ToolboxBuilder()
        .addItem(new ToolItem("Eraser Tool", "eraser.svg", () => {
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
                command: "calligraphy",
                value: "mouse",
                forward: true,
            });
        }))
        .addItem(new ToolItem("Set Color", "setColor.svg", () => {
            toolbox.showDialog(document.createTextNode("Test"));
        }))
        .addItem(new ToolItem("Set Thickness", "setThickness.svg", () => {

        }))
        .addItem(new ToolItem("Save", "save.svg", () => {
            sendMessage({
                command: "save",
                forward: true,
            });
        }))
        .addItem(new ToolItem("Open", "open.svg", () => {
            sendMessage({
                command: "open",
                forward: true,
            });
        }))
        .addItem(new ToolItem("Pencil", "pencil.svg", () => {
            sendMessage({
                command: "setDrawingMode",
                value: "pencil",
                forward: true,
            });
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

    const addToolOptions = () => {
        let toolColorSelect = document.createElement("input");
        let toolThicknessSlider = document.createElement("input");
        let toggleMouseBtn = document.createElement("button");
        let usingMouse = false;

        toolColorSelect.type = "color";
        toolColorSelect.oninput = toolColorSelect.onchange = function() {
            sendMessage({
                command: "setToolColor",
                value: this.value,
                forward: true,
            });
        };

        toolThicknessSlider.type = "range";
        toolThicknessSlider.min = 0.4;
        toolThicknessSlider.max = 50;
        toolThicknessSlider.oninput = function() {
            sendMessage({
                command: "setToolThickness",
                value: this.value,
                forward: true,
            });
        };

        toggleMouseBtn.onclick = () => {
            usingMouse = !usingMouse;

            if (usingMouse) {
                toggleMouseBtn.innerHTML = "Mouse";
            } else {
                toggleMouseBtn.innerHTML = "Draw";
            }

            sendMessage({
                command: "setDrawingMode",
                value: usingMouse,
                forward: true,
            });
        };

        toolColorSelect.alt = "Tool Color";
        toolThicknessSlider.alt = "Tool Thickness";
        toggleMouseBtn.innerHTML = "Mouse";

        controls.appendChild(toolColorSelect);
        controls.appendChild(toolThicknessSlider);
        controls.appendChild(toggleMouseBtn);

        chrome.runtime.onMessage.addListener((message) => {
            if (message.command === "setToolThickness") {
                toolThicknessSlider.value = message.value;
            } else if (message.command === "setToolColor") {
                toolColorSelect.value = message.value;
            }
        });

    };

    // Wrap the toolbox in an additional <div></div>: We can set CSS variables
    // on the enclosing div that affect controls and its children.
    controlsContainer.classList.add(`${CSS_PREFIX}controlsArea`);
    controls.classList.add(`${CSS_PREFIX}controls`);
    controls.classList.add(`__ANNOTATOR_CTRLS`);
    controlsContainer.appendChild(controls);
    document.documentElement.appendChild(controlsContainer);

    injectCSS();
})();
