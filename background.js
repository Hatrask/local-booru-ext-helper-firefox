// Configuration
const LOCAL_BOORU_API_URL = "http://127.0.0.1:8000/api/upload_from_url";
const DANBOORU_POST_URL_FRAGMENT = "donmai.us/posts/";
const NOTIFICATION_DISPLAY_TIME_MS = 4000; // Notifications will disappear after 4 seconds
const ICON_RESET_DELAY_MS = 3000; // Status icon will revert to default after 3 seconds

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

// --- Main Event Listeners ---

/**
 * Listens for the user clicking the browser action icon.
 */
browser.action.onClicked.addListener((tab) => {
    if (tab.url && tab.url.includes(DANBOORU_POST_URL_FRAGMENT)) {
        // Set the icon to "loading" immediately for instant feedback
        updateIcon('loading', tab.id);
        browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["scraper.js"],
        });
    } else {
        showTemporaryNotification("Incorrect Page", "This extension only works on Danbooru post pages.");
    }
});

/**
 * Listens for messages from the content script (scraper.js).
 */
browser.runtime.onMessage.addListener((message, sender) => {
    // Get the tab ID from the sender information
    const tabId = sender.tab.id;

    if (message.action === "scrapedData") {
        const { imageUrl, tags, error } = message.data;

        if (error || !imageUrl) {
            updateIcon('error', tabId);
            showTemporaryNotification("Scraping Failed", `Could not retrieve image data. Error: ${error || 'Unknown'}`);
            // Reset the icon after a short delay
            setTimeout(() => updateIcon('default', tabId), ICON_RESET_DELAY_MS);
            return;
        }
        
        // Use a finally block to ensure the icon is always reset
        let uploadStatus = 'error'; 

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
            uploadStatus = 'success'; // Mark as success for the finally block
            showTemporaryNotification("Upload Complete", data.message);
        })
        .catch(error => {
            console.error("Error uploading to local-booru:", error);
            showTemporaryNotification("Upload Failed", `Could not send data to local-booru. Error: ${error.message}`);
        })
        .finally(() => {
            // Update the icon based on the final status of the upload
            updateIcon(uploadStatus, tabId);
            // Schedule the icon to reset back to the default state
            setTimeout(() => updateIcon('default', tabId), ICON_RESET_DELAY_MS);
        });
    }
});