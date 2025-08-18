// Configuration
const LOCAL_BOORU_API_URL = "http://127.0.0.1:8000/api/upload_from_url";
const DANBOORU_POST_URL_FRAGMENT = "donmai.us/posts/";
const NOTIFICATION_DISPLAY_TIME_MS = 4000; // Notifications will disappear after 4 seconds
const ICON_RESET_DELAY_MS = 3000; // Status icon will revert to default after 3 seconds

// --- State Management for Multi-Upload ---
let multiUploadState = {
    inProgress: false,
    total: 0,
    processed: 0,
    success: 0,
    failures: 0
};


// --- Helper Functions ---

/**
 * Updates the browser action icon to reflect the current status.
 * @param {string} status - The current state ('loading', 'success', 'error', or 'default').
 * @param {number} tabId - The ID of the tab where the action was triggered.
 */
function updateIcon(status, tabId) {
    const statusIcons = {
        loading: "icons/icon-loading.png",
        success: "icons/icon-success.png",
        error: "icons/icon-error.png",
        default: "icons/icon-48.png"
    };
    browser.action.setIcon({
        path: statusIcons[status] || statusIcons.default,
        tabId: tabId
    });
}

/**
 * Creates a notification that automatically disappears after a set time.
 * @param {string} title - The title of the notification.
 * @param {string} message - The body text of the notification.
 */
function showTemporaryNotification(title, message) {
    browser.notifications.create({
        type: "basic",
        iconUrl: browser.runtime.getURL("icons/icon-96.png"),
        title: title,
        message: message
    }).then(notificationId => {
        // Set a timer to automatically clear the notification
        setTimeout(() => {
            browser.notifications.clear(notificationId);
        }, NOTIFICATION_DISPLAY_TIME_MS);
    });
}

/**
 * Handles the result of a single upload within a multi-upload batch.
 * @param {'success' | 'failure'} status - The outcome of the upload attempt.
 * @param {number} tabId - The ID of the tab that was processed.
 */
function handleMultiUploadResult(status, tabId) {
    multiUploadState.processed++;
    if (status === 'success') {
        multiUploadState.success++;
        updateIcon('success', tabId);
    } else {
        multiUploadState.failures++;
        updateIcon('error', tabId);
    }

    // Reset the icon for the individual tab after a delay
    setTimeout(() => updateIcon('default', tabId), ICON_RESET_DELAY_MS);

    // If all tabs in the batch have been processed, show the final report
    if (multiUploadState.processed >= multiUploadState.total) {
        showTemporaryNotification(
            "Multi-Upload Complete",
            `${multiUploadState.success} succeeded, ${multiUploadState.failures} failed.`
        );
        // Reset the state machine for the next batch
        multiUploadState.inProgress = false;
    }
}

/**
 * Initiates the scraping and uploading process for a collection of tabs.
 */
function handleMultiTabUpload() {
    browser.tabs.query({ highlighted: true, currentWindow: true }).then(tabs => {
        const danbooruTabs = tabs.filter(t => t.url && t.url.includes(DANBOORU_POST_URL_FRAGMENT));

        if (danbooruTabs.length === 0) {
            showTemporaryNotification("No Valid Tabs", "No selected tabs are Danbooru post pages.");
            return;
        }

        // Initialize the state for this batch
        multiUploadState = {
            inProgress: true,
            total: danbooruTabs.length,
            processed: 0,
            success: 0,
            failures: 0
        };

        // Start the scraping process for each valid tab
        danbooruTabs.forEach(tab => {
            updateIcon('loading', tab.id);
            browser.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["scraper.js"],
            }).catch(err => {
                // This handles cases where script injection itself fails
                console.error(`Script injection failed for tab ${tab.id}:`, err);
                // Since the scraper won't run, it won't send a message. We must handle its failure here.
                handleMultiUploadResult('failure', tab.id);
            });
        });
    });
}


/**
 * Processes the scraped data received from the content script.
 * @param {object} scrapedData - The data object from scraper.js.
 * @param {number} tabId - The ID of the tab where the data was scraped.
 */
function processScrapedData(scrapedData, tabId) {
    const { imageUrl, tags, error } = scrapedData;

    // Handle scraping errors
    if (error || !imageUrl) {
        console.error(`Scraping failed for tab ${tabId}: ${error || 'Unknown'}`);
        if (multiUploadState.inProgress) {
            handleMultiUploadResult('failure', tabId);
        } else {
            updateIcon('error', tabId);
            showTemporaryNotification("Scraping Failed", `Could not retrieve image data. Error: ${error || 'Unknown'}`);
            setTimeout(() => updateIcon('default', tabId), ICON_RESET_DELAY_MS);
        }
        return;
    }

    let uploadStatus = 'error'; // Assume failure until proven otherwise

    fetch(LOCAL_BOORU_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, tags: tags }),
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.detail || `HTTP error! Status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        uploadStatus = 'success';
        if (!multiUploadState.inProgress) {
            showTemporaryNotification("Upload Complete", data.message);
        }
    })
    .catch(err => {
        console.error("Error uploading to local-booru:", err);
        if (!multiUploadState.inProgress) {
            showTemporaryNotification("Upload Failed", `Could not send data to local-booru. Error: ${err.message}`);
        }
    })
    .finally(() => {
        if (multiUploadState.inProgress) {
            handleMultiUploadResult(uploadStatus, tabId);
        } else {
            // Handle icon updates for single-tab uploads
            updateIcon(uploadStatus, tabId);
            setTimeout(() => updateIcon('default', tabId), ICON_RESET_DELAY_MS);
        }
    });
}


// --- Main Event Listeners ---

/**
 * Creates the context menu item when the extension is installed.
 */
browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
        id: "upload-selected-tabs",
        title: "Upload selected tabs to Local Booru",
        contexts: ["tab"]
    });
});

/**
 * Listens for clicks on the context menu item.
 */
browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "upload-selected-tabs") {
        handleMultiTabUpload();
    }
});


/**
 * Listens for the user clicking the browser action icon.
 */
browser.action.onClicked.addListener((tab) => {
    // Check if multiple tabs are highlighted to decide between single vs. multi-upload
    browser.tabs.query({ highlighted: true, currentWindow: true }).then(tabs => {
        if (tabs.length > 1) {
            handleMultiTabUpload();
        } else {
            // Standard single-tab upload logic
            if (tab.url && tab.url.includes(DANBOORU_POST_URL_FRAGMENT)) {
                updateIcon('loading', tab.id);
                browser.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["scraper.js"],
                });
            } else {
                showTemporaryNotification("Incorrect Page", "This extension only works on Danbooru post pages.");
            }
        }
    });
});


/**
 * Listens for messages from the content script (scraper.js).
 */
browser.runtime.onMessage.addListener((message, sender) => {
    const tabId = sender.tab.id;
    if (message.action === "scrapedData") {
        processScrapedData(message.data, tabId);
    }
});