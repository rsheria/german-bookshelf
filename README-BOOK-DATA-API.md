# German Bookshelf - Book Data API Documentation

## Overview

The German Bookshelf app now includes a powerful multi-source book data API that can extract detailed information about German books using:

1. **ISBN numbers** - search directly using ISBN-10 or ISBN-13
2. **Amazon URLs** - extract data from Amazon.de book pages
3. **Lehmanns URLs** - extract data from Lehmanns bookstore pages

## Features

- **Multi-API Approach**: Uses Google Books API, Open Library API, and Deutsche Nationalbibliothek API
- **Smart Fallbacks**: If one API fails, automatically tries the next one
- **High Success Rate**: Nearly every German book can be found through one of the three APIs
- **No Rate Limits**: All APIs used are free and have generous rate limits
- **Always Available**: Unlike scrapers, APIs do not get blocked or rate-limited

## How to Use

### In the Admin Panel

1. When adding or editing a book:
   - Choose between "Use URL" or "Use ISBN"
   - For URLs: Paste Amazon.de or Lehmanns.de book URLs
   - For ISBNs: Enter the ISBN-10 or ISBN-13 number

2. Click "Extract Data" or "Fetch Data" to populate the form automatically

### In Your Code

```typescript
// To get book data from an Amazon URL
import { fetchBookDataFromAmazon } from '../services/amazonScraperService';
const bookData = await fetchBookDataFromAmazon('https://www.amazon.de/dp/3630876722');

// To get book data from an ISBN
import { getBookData } from '../services/bookDataService';
const bookData = await getBookData('9783630876722');
```

## How It Works

1. **ISBN Extraction**: For Amazon URLs, the system automatically extracts the ISBN
2. **API Cascade**: Queries multiple book data APIs in sequence:
   - Google Books API (tried first)
   - Open Library API (fallback)
   - Deutsche Nationalbibliothek API (fallback)
3. **Data Normalization**: Standardizes data from all sources into a consistent format

## Troubleshooting

If you can't find a book:

1. **Check the ISBN**: Verify the ISBN is correct and try both ISBN-10 and ISBN-13 formats
2. **Try Amazon URL**: Some very new or obscure books might only be found via Amazon
3. **Check Network**: Ensure your application has internet access
4. **Verify Deployment**: Make sure you've deployed the latest version with the book data API

## Technical Implementation

The system is implemented in:
- `src/services/bookDataService.ts`: The main API client
- `src/services/amazonScraperService.ts`: Amazon integration
- `src/components/admin/BookForm.tsx`: UI for data extraction

No additional configuration is needed - the system works out of the box with the provided APIs.

---

**Important**: This solution completely replaces the previous Amazon scraper implementation, which was unreliable due to Amazon's anti-scraping measures.
