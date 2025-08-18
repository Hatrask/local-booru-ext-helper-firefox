# local-booru-ext-helper-firefox

This is a companion browser extension for the [local-booru](https://github.com/Hatrask/local-booru) self-hosted image gallery. It allows you to instantly scrape and upload an image and its tags from a Danbooru post page directly into your personal booru with a single click.

## Features

*   **One-Click Upload:** Sends the image and its associated tags from the current Danbooru post to the local booru server.
*   **Categorized Tag Extraction:** Extracts all tags from the page and prefixes them with their corresponding category (e.g., `artist:`, `character:`, `copyright:`).
*   **Image URL Detection:** Identifies and uses the highest quality image URL available on the page, including direct links for resized images.
*   **Toolbar Status Icon:** The extension's toolbar icon changes to indicate the current upload state: loading, success, or error.
*   **Temporary Notifications:** Displays upload status notifications that disappear automatically after a few seconds.

## Prerequisites

1.  **Firefox Browser:** This extension is built for Firefox.
2.  **Running Local Booru Server:** You must have your `local-booru` server application running and accessible from the same machine. By default, the extension assumes the server is at `http://127.0.0.1:8000`.

## Installation

Since this extension is not on the official Firefox Add-ons store, you need to load it manually as a temporary add-on.

1.  **Clone or Download this Repository:**
    ```bash
    git clone <this-repository-url>
    cd local-booru-ext-helper-firefox
    ```
    Alternatively, you can download the repository as a ZIP file and extract it.

2.  **Open Firefox** and navigate to the following address in your URL bar:
    `about:debugging`

3.  On the left-hand menu, click **"This Firefox"**.

4.  Click the **"Load Temporary Add-on..."** button.

5.  A file dialog will open. Navigate to the directory where you cloned or extracted this repository and select the `manifest.json` file.

The extension icon will now appear in your Firefox toolbar.

**Note:** Temporary add-ons are removed when you restart Firefox. You will need to repeat these steps to re-load the extension after a browser restart.

## Usage

1.  Ensure your `local-booru` server is running.
2.  Navigate to any image post on the Danbooru website (e.g., `danbooru.donmai.us/posts/12345`).
3.  Click the "Local Booru Uploader" icon in your toolbar.
4.  Watch the icon change to see the status. A notification will pop up to confirm that the upload is complete, if it was a duplicate, or if it failed.

That's it! The image and its tags are now in your personal gallery.

## Configuration

The extension is hardcoded to send data to the default `local-booru` server address. If you are running your server on a different IP address or port, you will need to make a small change.

1.  Open the `background.js` file in a text editor.
2.  Find the following line at the top of the file:
    ```javascript
    const LOCAL_BOORU_API_URL = "http://127.0.0.1:8000/api/upload_from_url";
    ```
3.  Change the URL to match your server's address.
4.  Save the file and **Reload** the extension from the `about:debugging` page in Firefox.

## Project Structure

*   `manifest.json`: The core configuration file for the extension, defining its permissions, scripts, and properties.
*   `background.js`: The service worker that runs in the background. It handles the API requests to the local booru server and manages the UI feedback (icons and notifications).
*   `scraper.js`: The content script that is injected into the Danbooru page. Its sole job is to read the page's HTML to find the image URL and all associated tags.
*   `icons/`: Contains all the icons used for the toolbar and notifications, including the different status indicators (default, loading, success, error).

---
## License

This project is licensed under the MIT License. See the `LICENSE` file for details.