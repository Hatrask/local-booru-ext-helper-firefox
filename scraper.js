(function() {
    'use strict';

    /**
     * Scrapes the image URL and tags from the current Danbooru page.
     */
    function scrapeDanbooruData() {
        let imageUrl = '';
        const tags = [];

        // 1. Find the image URL using a more robust, prioritized method.

        // Priority 1: Check for the "View Original" link for very large images.
        // This is the highest quality source when available.
        const originalLink = document.querySelector('#image-resize-notice a.image-view-original-link');
        if (originalLink) {
            imageUrl = originalLink.href;
        }

        // Priority 2: If no resize link, check for the 'data-file-url' attribute on the container.
        // This is a very reliable source for the direct file URL.
        if (!imageUrl) {
            const imageContainer = document.querySelector('.image-container[data-file-url]');
            if (imageContainer) {
                // The dataset property provides easy access to data-* attributes.
                imageUrl = imageContainer.dataset.fileUrl;
            }
        }

        // Priority 3 (Fallback): If the data attribute isn't found, find the main image element
        // by its ID and get its 'src' attribute. This selector is now corrected.
        if (!imageUrl) {
            const imageElement = document.querySelector('img#image'); // CORRECTED SELECTOR
            if (imageElement) {
                imageUrl = imageElement.src;
            }
        }
        
        if (!imageUrl) {
            return { error: 'Could not find the main image URL on the page.' };
        }

        // 2. Define the mapping between Danbooru's CSS classes and your booru's tag categories.
        const tagCategoryMapping = {
            'artist-tag-list': 'artist',
            'copyright-tag-list': 'copyright',
            'character-tag-list': 'character',
            'general-tag-list': 'general',
            'meta-tag-list': 'metadata'
        };

        const tagListSection = document.querySelector('section#tag-list');
        if (!tagListSection) {
            console.warn('Local Booru Uploader: Could not find tag list section.');
            return { imageUrl, tags }; // Return with empty tags if section is missing
        }

        // 3. Iterate through each category and extract the tags.
        for (const [className, category] of Object.entries(tagCategoryMapping)) {
            const tagUl = tagListSection.querySelector(`ul.${className}`);
            if (tagUl) {
                const listItems = tagUl.querySelectorAll('li[data-tag-name]');
                listItems.forEach(li => {
                    const tagName = li.dataset.tagName;
                    if (tagName) {
                        if (category === 'general') {
                            tags.push(tagName);
                        } else {
                            tags.push(`${category}:${tagName}`);
                        }
                    }
                });
            }
        }

        return { imageUrl, tags };
    }

    // After scraping, send the collected data back to the background script.
    const scrapedData = scrapeDanbooruData();
    browser.runtime.sendMessage({ action: "scrapedData", data: scrapedData });

})();