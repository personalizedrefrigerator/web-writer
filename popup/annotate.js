"use strict";

/**
 * Handles the popup GUI & communication with content scripts.
 *
 * Ref:
 *  • https://github.com/mdn/webextensions-examples/blob/master/beastify/popup/choose_beast.js
 */

window.browser = window.browser || window.chrome;

async function sendMessage(message) {
    let tabs = await browser.tabs.query({active: true, currentWindow: true});
    browser.tabs.sendMessage(tabs[0].id, message);
}

async function sendThickness(thickness) {
    await sendMessage({
        command: "setThickness",
        value: parseFloat(thickness),
    });
    localStorage.setItem(`thickness`, thickness);
}

async function sendColor(color) {
    await sendMessage({
        command: "setColor",
        value: color,
    });
    localStorage.setItem(`color`, color);
}

async function main() {
    try {
        await browser.tabs.executeScript({ file: "/content/annotate.js" });
        //await browser.tabs.addCSS({ file: "/content/annotate.css" });
    }
    catch(e) {
        messageArea.innerText = `Error: ${e}`;
        console.error(e);
    }

    let thicknessSlider = document.createElement("input");
    let colorInput = document.createElement("input");
    let toggleInput = document.createElement("button");

    thicknessSlider.value = localStorage.getItem(`thickness`) || 2;
    colorInput.value = localStorage.getItem(`color`) || '#ff0000';

    colorInput.type = "text";
    thicknessSlider.type = "range";
    thicknessSlider.min = 1;
    thicknessSlider.max = 12;

    toggleInput.innerText = "Toggle Input";

    thicknessSlider.oninput = thicknessSlider.onchange = async () => {
        sendThickness(thicknessSlider.value);
    };

    colorInput.oninput = colorInput.onchange = async () => {
        sendColor(colorInput.value);
    };

    toggleInput.onclick = () => {
        sendMessage({
            command: "toggleInput",
        });
    };

    sendThickness(thicknessSlider.value);
    sendColor(colorInput.value);

    optionsArea.appendChild(thicknessSlider);
    optionsArea.appendChild(colorInput);
    optionsArea.appendChild(toggleInput);
}

main();
