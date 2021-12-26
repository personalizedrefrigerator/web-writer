"use strict";

/// Run a script in [tabId], with the given options.
/// Options are the same as chrome.tabs.executeScript.
/// Returns a promise.
function executeScript(tabId, options) {
    return new Promise((resolve, reject) => {
        chrome.tabs.executeScript(tabId, options, resolve);
    });
}

/// Send [message] to the current tab
async function sendMessage(message, tabId) {
    tabId = tabId || await new Promise((resolve, reject) => {
        chrome.tabs.query({ currentWindow: true, active: true },
            (tabs) => resolve(tabs[0].id));
    });

    chrome.tabs.sendMessage(
        tabId,
        message);
}

chrome.browserAction.onClicked.addListener(async (tab) => {
    await executeScript(tab.id, {
        file: "/content/annotate.js",
        allFrames: true,
    });

    await executeScript(tab.id, {
        file: "/content/controls.js",
    });

    sendMessage({ command: "setToolColor", value: localStorage.getItem("toolColor") || "#f00"}, tab.id);
    sendMessage({ command: "setToolThickness", value: localStorage.getItem("toolThickness") || 0.5}, tab.id);
});

chrome.runtime.onMessage.addListener(async (message) => {
    console.log("Got message! " + message);

	switch (message.command) {
        case "setToolColor":
            localStorage.setItem("toolColor", message.value);
            break;
        case "setToolThickness":
            localStorage.setItem("toolThickness", message.value);
            break;
        case "setDrawingMode":
            break;
	}

    if (message.forward) {
        message.forward = false;

        sendMessage(message);
    }
});
