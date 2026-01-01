chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "scrapeJobs") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                console.error("No active tab found.");
                return;
            }

            let activeTab = tabs[0].id;

            // Ensure content script is injected before sending the message
            chrome.scripting.executeScript({
                target: { tabId: activeTab },
                files: ["content.js"]
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Failed to inject content script:", chrome.runtime.lastError);
                } else {
                    chrome.tabs.sendMessage(activeTab, { action: "scrapeJobs", maxPages: message.maxPages });
                }
            });
        });
    }
});
