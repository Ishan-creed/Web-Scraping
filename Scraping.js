const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

// Function to scrape reviews from TripAdvisor
async function scrapeTripAdvisorReviews() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
  });
  const page = await browser.newPage();

  // Currently Try using it for resturants, hotel link might not work... wokring on that
  
  const tripAdvisorUrl = 'https://www.tripadvisor.in/Restaurant_Review-g295424-d18856876-Reviews-Kinara_by_Vikas_Khanna-Dubai_Emirate_of_Dubai.html';

  let currentPage = 1;
  const tripAdvisorData = [];

  while (true) {
    // Construct the URL for each page of reviews
    const pageUrl = `${tripAdvisorUrl}-or${(currentPage - 1) * 10}`;
    await page.goto(pageUrl);
    await page.waitForSelector('.review-container');

    // Extract and format review data from the current page
    const reviews = await page.evaluate(() => {
      const results = [];
      const items = document.querySelectorAll('.review-container');

      items.forEach((item) => {
        // Extract and parse the rating
        let ratingElement = item.querySelector('.ui_bubble_rating').getAttribute('class');
        let integer = ratingElement.replace(/[^0-9]/g, '');
        let parsedRating = parseInt(integer) / 10;

        // Extract and format date of visit
        let dateOfVisitElement = item.querySelector('.prw_rup.prw_reviews_stay_date_hsx').innerText;
        let parsedDateOfVisit = dateOfVisitElement.replace('Date of visit:', '').trim();

        // Push review data into results array
        results.push({
          name: item.querySelector('.info_text.pointer_cursor div').innerText,
          rating: parsedRating,
          dateOfVisit: parsedDateOfVisit,
          ratingDate: item.querySelector('.ratingDate').getAttribute('title'),
          title: item.querySelector('.noQuotes').innerText,
          content: item.querySelector('.partial_entry').innerText,
        });
      });

      return results;
    });

    // Append the reviews from the current page to the main data array
    tripAdvisorData.push(...reviews);

    // Log reviews for the current page
    console.log(`TripAdvisor Page ${currentPage} Reviews: `, reviews);

    // Check if there is a next page, if not, break the loop
    const nextButton = await page.$('.nav.next');
    if (!nextButton) {
      break;
    }

    // Click the next page button and wait for a short duration
    await nextButton.click();
    await page.waitForTimeout(1000);
    currentPage++;
  }

  // Close the browser and return the scraped TripAdvisor data
  await browser.close();
  return tripAdvisorData;
}

// Function to scrape reviews from Google Travel
async function scrapeGoogleTravelReviews() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const googleTravelUrl = 'https://www.google.com/travel/search?q=lemon%20tree%20dubaI&g2lb=...'; // Your URL here

  const data = [];
  let previousReviewCount = 0;
  let currentReviewCount = 0;

  // Navigate to the Google Travel URL
  await page.goto(googleTravelUrl);

  // Infinite scroll to load more reviews
  while (true) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1000);

    // Extract reviews using Cheerio
    const pageContent = await page.content();
    const $ = cheerio.load(pageContent);

    currentReviewCount = $('.Svr5cf.bKhjM').length;

    // If no new reviews are loaded, exit the loop
    if (currentReviewCount === previousReviewCount) {
      break;
    }

    previousReviewCount = currentReviewCount;
  }

  // Extract and format review data using Cheerio
  const pageContent = await page.content();
  const $ = cheerio.load(pageContent);

  const reviews = $('.Svr5cf.bKhjM');
  reviews.each((i, review) => {
    const date = $(review).find('.iUtr1.CQYfx').text().trim();
    const reviewerName = $(review).find('a.DHIhE.QB2Jof').text().trim();
    const rating = $(review).find('div.GDWaad').text().trim();
    const reviewText = $(review).find('div.K7oBsc').text().trim();
    const reviewNo = i + 1;

    data.push({
      Review_No: reviewNo,
      Name: reviewerName,
      Rating: rating,
      Review: reviewText,
      Date: date,
    });
  });

  // Log the scraped Google Travel data and close the browser
  console.log(data);
  await browser.close();
  return data;
}

// Main function to orchestrate scraping both sources
async function main() {
  const tripAdvisorReviews = await scrapeTripAdvisorReviews();
  console.log('TripAdvisor Reviews:', tripAdvisorReviews);

  const googleTravelReviews = await scrapeGoogleTravelReviews();
  console.log('Google Travel Reviews:', googleTravelReviews);
}

// Call the main function to start the scraping process
main();
