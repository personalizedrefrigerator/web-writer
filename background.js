"use strict";

chrome.browserAction.onClicked.addListener((tab) => {
    chrome.tabs.executeScript(tab.id, {
        file: "/content/annotate.js",
        allFrames: true,
    });

    chrome.tabs.executeScript(tab.id, {
        file: "/content/controls.js",
    });
});

chrome.runtime.onMessage.addListener(async (message) => {
	let tabId = await chrome.tabs.query({ currentWindow: true, active: true }, Promise.resolve);
	switch (message.command) {
        case "setToolColor":
            break;
        case "setToolThickness":
            break;
        case "setTool":
            break;
	}

    if (message.forward) {
        message.forward = false;

        chrome.tabs.sendMessage(
            tabId,
            message);
    }
});
