"use strict";

(function() {
    if (window.__ANNOTATOR_CTRL_SCRIPT_INJECTED) {
        return;
    }
    window.__ANNOTATOR_CTRL_SCRIPT_INJECTED = true;

    const CTRLS_Z_INDEX = 4096 * 3;

    const CSS_PREFIX = `__ANNOTATOR_CONTROLS__`;
    const CSS = `
        .${CSS_PREFIX}controlsArea {
            position: fixed;
            top: 100%;
            left: 0;
            right: 0;

            margin-top: -14px;

            transition: all 0.3s ease;

            background-color: black;
            color: white;
            font: 12pt sans;
            overflow-y: auto;

            border-top-left-radius: 5px;
            border-top-right-radius: 5px;
            box-shadow: 0px 0px 3px rgba(0, 0, 0, 0.25);

            padding: 5px;

            z-index: ${CTRLS_Z_INDEX};
        }

        .${CSS_PREFIX}controlsArea:hover, .${CSS_PREFIX}controlsArea:active {
            margin-top: 0;
            bottom: 0;
            top: auto;
        }

        .${CSS_PREFIX}controlsArea > div {
            /* Center the controls in their container. */

            margin-left: auto;
            margin-right: auto;
            max-width: 300px;
        }

        .${CSS_PREFIX}controlsArea button {
            border: 1px solid white;
            background-color: black;
            color: white;
            padding: 4px;
            border-radius: 4px;
            box-shadow: 0px 0px 12px red;
        }

        @media print {
            .${CSS_PREFIX}controlsArea {
                display: none;
            }
        }
    `;


    let controlsContainer = document.createElement("div");
    let controls = document.createElement("div");

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

    controlsContainer.classList.add(`${CSS_PREFIX}controlsArea`);
    controls.classList.add(`${CSS_PREFIX}controls`);
    controls.classList.add(`__ANNOTATOR_CTRLS`);

    addToolOptions();

    controlsContainer.appendChild(controls);
    document.documentElement.appendChild(controlsContainer);

    injectCSS();
})();
