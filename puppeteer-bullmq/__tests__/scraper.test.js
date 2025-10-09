const { scrapePrice } = require('../scraper');
const axios = require('axios');
const cheerio = require('cheerio');

jest.mock('axios');
jest.mock('cheerio');

describe('scrapePrice', () => {
  test('extracts numeric price successfully', async () => {
    axios.get.mockResolvedValue({ data: '<div class="price">$29.99</div>' });
    const $ = jest.fn(() => ({ text: () => '$29.99', trim: () => '$29.99' }));
    $.load = jest.fn().mockReturnValue($);
    cheerio.load.mockReturnValue($);

    const result = await scrapePrice('https://example.com', '.price');
    expect(result).toBe(29.99);
  });

  test('throws error when price is invalid', async () => {
    axios.get.mockResolvedValue({ data: '<div class="price">N/A</div>' });
    const $ = jest.fn(() => ({ text: () => 'N/A', trim: () => 'N/A' }));
    $.load = jest.fn().mockReturnValue($);
    cheerio.load.mockReturnValue($);

    await expect(scrapePrice('https://example.com', '.price')).rejects.toThrow('Price not found');
  });
});
