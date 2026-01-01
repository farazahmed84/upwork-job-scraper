document.addEventListener("DOMContentLoaded", () => {
    const scrapeButton = document.getElementById("scrape");
    const pageInput = document.getElementById("pageCount");

    scrapeButton.addEventListener("click", () => {
        let maxPages = pageInput.value ? parseInt(pageInput.value, 10) : null;

        chrome.runtime.sendMessage({ action: "scrapeJobs", maxPages: maxPages });
    });
});
