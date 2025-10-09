const puppeteer = require('puppeteer');
const { scrapeVariantPriceSafe } = require('../puppeteerScraper');

jest.mock('puppeteer');

describe('scrapeVariantPriceSafe', () => {
  let mockBrowser, mockPage;

  beforeEach(() => {
    mockPage = {
      setRequestInterception: jest.fn(),
      on: jest.fn(),
      goto: jest.fn(),
      waitForSelector: jest.fn(),
      $: jest.fn(),
      evaluate: jest.fn(),
      select: jest.fn(),
      click: jest.fn()
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn()
    };

    puppeteer.launch.mockResolvedValue(mockBrowser);
  });

  test('scrapes price successfully', async () => {
    const html = '<span class="price">$19.99</span>';
    mockPage.content = jest.fn().mockResolvedValue(html);

    const cheerio = require('cheerio');
    mockPage.evaluate.mockImplementation((fn, el) => 'span');
    mockPage.$.mockResolvedValue({});

    const price = await scrapeVariantPriceSafe(
      'https://example.com',
      '.price',
      []
    );

    expect(puppeteer.launch).toHaveBeenCalled();
    expect(mockPage.goto).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ waitUntil: 'domcontentloaded' })
    );
  });

  test('handles missing variant gracefully', async () => {
    mockPage.waitForSelector.mockRejectedValue(new Error('Not found'));
    const price = await scrapeVariantPriceSafe(
      'https://example.com',
      '.price',
      [{ selector: '.nonexistent', value: 'x' }]
    );
    expect(mockPage.goto).toHaveBeenCalled();
  });
});
