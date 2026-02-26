let allJobs = []; // Store all jobs across pages

async function scrapeJobs(maxPages = null) {
    allJobs = []; // Clear previous jobs before starting a new scrape
    let nextPageButton;
    let pageCount = 0;

    do {
        pageCount++;
        console.log(`Scraping page ${pageCount}`);
        
        // Wait until all job listings are loaded
        await new Promise(resolve => {
            const checkInterval = setInterval(() => {
                const resultSection = document.querySelector('section[data-ev-label="search_result_impression"]');
                if (resultSection && resultSection.querySelectorAll('article').length > 0) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 500);
        });

        // Extract job titles and descriptions AFTER all listings are fully loaded
        document.querySelectorAll('article.job-tile').forEach(job => {
            const titleElement = job.querySelector('h2.job-tile-title a');
            const descriptionElement = job.querySelector('div[data-test*="JobDescription"] p.mb-0');

            if (titleElement) {
                let rawDescription = descriptionElement ? descriptionElement.innerText.trim() : "No description available";

                // CLEAN THE DESCRIPTION
                let cleanedDescription = rawDescription
                    .replace(/[\r\t]/g, ' ')   // Remove carriage returns and tabs
                    .replace(/"/g, '""')     // Escape double quotes for CSV
                    .replace(/•/g, '-')        // Replace bullet points with hyphens
                    .replace(/–/g, '-')        // Replace special dashes with normal hyphens
                    .replace(/\n{3,}/g, '\n\n') // Prevent excessive line breaks
                    .trim();

                allJobs.push({
                    title: titleElement.innerText.trim(),
                    description: cleanedDescription
                });
            }
        });

        // Stop if maxPages limit is reached
        if (maxPages !== null && pageCount >= maxPages) {
            console.log(`Reached max page limit: ${maxPages}`);
            nextPageButton = null; // Stop pagination explicitly
            break;
        }

        // Check for pagination button and ensure it's NOT disabled
        nextPageButton = document.querySelector('a[data-ev-label="pagination_next_page"]');
        if (nextPageButton && !nextPageButton.disabled) {
            console.log("Clicking next page button");
            
            // Ensure last extracted job is stored before moving to next page
            await new Promise(resolve => setTimeout(resolve, 1000)); // Short pause before navigation
            
            // Random delay between 1-5 seconds to avoid detection
            await new Promise(resolve => setTimeout(resolve, Math.random() * 4000 + 1000));
            nextPageButton.click();

            // Wait for the next page to fully load before continuing
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    const resultSection = document.querySelector('section[data-ev-label="search_result_impression"]');
                    if (resultSection && resultSection.querySelectorAll('article').length > 0) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 500);
            });
        } else {
            console.log("No more pages available or pagination button disabled");
            nextPageButton = null; // Stop pagination if no next page
        }
    } while (nextPageButton);

    // Call CSV export only after all pages are scraped
    if (pageCount === maxPages || nextPageButton === null) {
        console.log("Exporting CSV with", allJobs.length, "jobs");
        exportToCSV(allJobs);
    }
}

// Function to properly format and export data as CSV
function exportToCSV(jobs) {
    if (jobs.length === 0) {
        console.error("No jobs found to export.");
        return;
    }

    function cleanCSVText(text) {
        return `"${text.replace(/"/g, '""')}"`; // Properly escape double quotes for CSV
    }

    let csvContent = "Title,Description\n" +
        jobs.map(job => `${cleanCSVText(job.title)},${cleanCSVText(job.description)}`).join("\n");

    let blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "upwork_jobs.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "scrapeJobs") {
        console.log("Received scrape request for max pages:", message.maxPages);
        scrapeJobs(message.maxPages);
    }
});
