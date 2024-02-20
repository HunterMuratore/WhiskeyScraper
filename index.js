const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const jsonData = require('./keywords.json');
const keywords = jsonData.keywords;

const url = 'https://whiskeyraiders.com/archive/';

// Function to fetch HTML content of a webpage
async function fetchHTML(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching the page:', error);
        throw error;
    }
}

// Function to scrape whiskey data from the webpage
async function scrapeWhiskeyData() {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    const whiskeyData = [];

    // Find the table and iterate over each row
    const rows = $('.o-archive__table-body .o-archive__table-row');

    for (let i = 0; i < rows.length; i++) {
        const row = rows.eq(i);
        const cells = row.find('.o-archive__table-cell');
        const rowData = {
            name: cells.eq(0).text().trim(),
            type: cells.eq(1).text().trim(),
            rating: cells.eq(2).text().trim(),
            link: cells.eq(0).find('a').attr('href') // Extract link from the first cell
        };

        // Scrape detailed information
        const details = await scrapeWhiskeyDetails(rowData.link);
        if (details) {
            rowData.image = details.image;
            rowData.stats = details.stats;
            rowData.houseReviews = details.houseReviews;
        }

        whiskeyData.push(rowData);

        console.log('Whiskey data saved for row', i);
    }

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
            let label = $(element).find('span.o-spirit-stat-key').text().trim();
            label = label.toLowerCase().replace(':', '');
            const value = $(element).find('p.o-spirit-stat-value').text().trim();
            stats[label] = value;
        });
        const houseReviews = {};
        $('.o-spirit-house-review-list-item').each((index, element) => {
            let label = $(element).find('span.o-spirit-house-review-key').text().trim();
            label = label.toLowerCase().replace(':', '');
            const value = $(element).find('p.o-spirit-house-review-value').text().trim();
            if (label) {
                if (label === 'nose' || label === 'taste' || label === 'finish') {
                    // Extract keywords from the paragraph
                    const keywords = extractKeywords(value);
                    houseReviews[label] = keywords;
                } else {
                    houseReviews[label] = value;
                }
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
    // Remove punctuation marks
    const paragraphWithoutPunctuation = paragraph.replace(/[^\w\s]/g, '');

    // Split the paragraph into words
    const words = paragraphWithoutPunctuation.split(/\s+/);

    // Create an object to store unique keywords
    const uniqueKeywords = {};

    // Filter out the keywords and add them to the uniqueKeywords object
    words.forEach(word => {
        const lowercaseWord = word.toLowerCase();
        if (keywords.includes(lowercaseWord)) {
            uniqueKeywords[lowercaseWord] = true;
        }
    });

    // Extract the unique keywords into an array
    const extractedKeywords = Object.keys(uniqueKeywords);

    return extractedKeywords;
}

async function main() {
    try {
        const whiskeyData = await scrapeWhiskeyData();
        // Save the data to a JSON file
        fs.writeFile('whiskey_data.json', JSON.stringify(whiskeyData, null, 2), err => {
            if (err) {
                console.error('Error writing file:', err);
                return;
            }
            console.log('Whiskey data has been saved to whiskey_data.json');
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
