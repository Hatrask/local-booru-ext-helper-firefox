(function() {
    'use strict';

    /**
     * Scrapes the image URL and tags from the current Danbooru page.
     */
    function scrapeDanbooruData() {
        let imageUrl = '';
        const tags = [];

        // 1. Find the image URL.
        // Danbooru provides a specific link for the original, larger image if it's been resized for display.
        // We prioritize this link to get the best quality version.
        const originalLink = document.querySelector('#image-resize-notice a.image-view-original-link');

        if (originalLink) {
            imageUrl = originalLink.href;
        } else {
            // If the resize notice isn't present, the main image is the original.
            const imageElement = document.querySelector('picture#image img');
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
            // Target only <ul> elements with the specified class within the tag section for precision.
            const tagUl = tagListSection.querySelector(`ul.${className}`);
            if (tagUl) {
                const listItems = tagUl.querySelectorAll('li[data-tag-name]');
                listItems.forEach(li => {
                    const tagName = li.dataset.tagName;
                    if (tagName) {
                        // For all categories except 'general', prefix the tag with its category.
                        // Your backend's get_or_create_tags function is designed to handle this format.
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