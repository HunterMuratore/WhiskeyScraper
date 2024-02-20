const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const url = 'https://whiskeyraiders.com/archive/';

// Function to fetch HTML content of a webpage
async function fetchHTML(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching the page:', error);
    }
}

// Function to scrape whiskey data from the webpage
async function scrapeWhiskeyData() {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    const whiskeyData = [];

    // Find the table and iterate over each row
    $('.o-archive__table .o-archive__table-row').each(async (index, element) => {
        const cells = $(element).find('.o-archive__table-cell');
        const rowData = {
            name: $(cells[0]).text().trim(),
            type: $(cells[1]).text().trim(),
            rating: $(cells[2]).text().trim(),
            link: $(cells[0]).find('a').attr('href') // Extract link from the first cell
        };

        // Scrape detailed information
        const details = await scrapeWhiskeyDetails(rowData.link);
        if (details) {
            rowData.image = details.image;
            rowData.stats = details.stats;
            rowData.houseReviews = details.houseReviews;
        }

        whiskeyData.push(rowData);
    });

    return whiskeyData;
}

// Function to scrape detailed whiskey data from the whiskey's page
async function scrapeWhiskeyDetails(link) {
    try {
        const html = await fetchHTML(link);
        const $ = cheerio.load(html);

        // Extract detailed information
        const image = $('.o-ribbon-wrap .o-spirit-image').attr('src');
        const stats = {};
        $('.o-spirit-stat-list li').each((index, element) => {
            const label = $(element).find('p.o-spirit-stat-key').text().trim();
            const value = $(element).find('p.o-spirit-stat-value').text().trim();
            stats[label] = value;
        });
        const houseReviews = {};
        $('.o-spirit-house-review-list-item').each((index, element) => {
            const label = $(element).find('p.o-spirit-house-review-key').text().trim();
            const value = $(element).find('p.o-spirit-house-review-value').text().trim();
            if (label === 'Nose' || label === 'Taste' || label === 'Finish') {
                // Extract keywords from the paragraph
                const keywords = extractKeywords(value);
                houseReviews[label] = keywords;
            } else {
                houseReviews[label] = value;
            }
        });

        return {
            image,
            stats,
            houseReviews
        };
    } catch (error) {
        console.error('Error scraping whiskey details:', error);
        return null;
    }
}

// Function to extract keywords from the paragraph
function extractKeywords(paragraph) {
    // Define your list of keywords for each category
    const noseKeywords = ['apple', 'caramel', 'chocolate', 'sherry'];
    const tasteKeywords = ['vanilla', 'spice', 'oak', 'honey'];
    const finishKeywords = ['long', 'smoky', 'peat', 'sweet'];

    // Split the paragraph into words
    const words = paragraph.split(/\s+/);

    // Filter out the keywords
    const nose = words.filter(word => noseKeywords.includes(word.toLowerCase()));
    const taste = words.filter(word => tasteKeywords.includes(word.toLowerCase()));
    const finish = words.filter(word => finishKeywords.includes(word.toLowerCase()));

    return { nose, taste, finish };
}

async function main() {
    const whiskeyData = await scrapeWhiskeyData();
    // Save the data to a JSON file
    fs.writeFile('whiskey_data.json', JSON.stringify(whiskeyData, null, 2), err => {
        if (err) {
            console.error('Error writing file:', err);
            return;
        }
        console.log('Whiskey data has been saved to whiskey_data.json');
    });
}

main().catch(err => console.error('Error:', err));