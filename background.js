// Configuration
const LOCAL_BOORU_API_URL = "http://127.0.0.1:8000/api/upload_from_url";
const DANBOORU_POST_URL_FRAGMENT = "donmai.us/posts/";

/**
 * Listens for the user clicking the browser action icon.
 */
browser.action.onClicked.addListener((tab) => {
    // Only run the scraper on valid Danbooru post pages.
    if (tab.url && tab.url.includes(DANBOORU_POST_URL_FRAGMENT)) {
        browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["scraper.js"],
        });
    } else {
        // Notify the user if they are on the wrong page.
        browser.notifications.create({
            type: "basic",
            iconUrl: browser.runtime.getURL("icons/icon-96.png"),
            title: "Incorrect Page",
            message: "This extension only works on Danbooru post pages."
        });
    }
});

/**
 * Listens for messages from the content script (scraper.js).
 */
browser.runtime.onMessage.addListener((message) => {
    if (message.action === "scrapedData") {
        const { imageUrl, tags, error } = message.data;

        // If the scraper returned an error, notify the user.
        if (error || !imageUrl) {
            browser.notifications.create({
                type: "basic",
                iconUrl: browser.runtime.getURL("icons/icon-96.png"),
                title: "Scraping Failed",
                message: `Could not retrieve image data. Error: ${error || 'Unknown'}`
            });
            return;
        }

        // Send the scraped data to your local-booru backend using the fetch API.
        fetch(LOCAL_BOORU_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: imageUrl, tags: tags }),
        })
        .then(response => {
            // If the server responds with an error, try to parse the error message.
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.detail || `HTTP error! Status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            // On success, show a confirmation notification.
            browser.notifications.create({
                type: "basic",
                iconUrl: browser.runtime.getURL("icons/icon-96.png"),
                title: "Upload Complete",
                message: data.message,
            });
        })
        .catch(error => {
            // On failure (e.g., network error, server down), show an error notification.
            console.error("Error uploading to local-booru:", error);
            browser.notifications.create({
                type: "basic",
                iconUrl: browser.runtime.getURL("icons/icon-96.png"),
                title: "Upload Failed",
                message: `Could not send data to local-booru. Is the server running? Error: ${error.message}`,
            });
        });
    }
});