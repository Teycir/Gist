/**
 * @jest-environment node
 */

describe('Background Service Worker', () => {
  let mockSendResponse;
  let mockFetch;
  let messageListener;

  beforeEach(() => {
    mockSendResponse = jest.fn();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    global.chrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn((listener) => {
            messageListener = listener;
          })
        }
      }
    };
    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should register message listener', () => {
    require('../background.js');
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    expect(messageListener).toBeDefined();
  });

  test('should handle fetchPage action', async () => {
    mockFetch.mockResolvedValue({
      text: () => Promise.resolve('<html>Test</html>')
    });

    require('../background.js');
    const request = { action: 'fetchPage', url: 'https://example.com' };
    messageListener(request, {}, mockSendResponse);

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockFetch).toHaveBeenCalledWith('https://example.com', expect.any(Object));
  });

  test('should return HTML on successful fetch', async () => {
    mockFetch.mockResolvedValue({
      text: () => Promise.resolve('<html>Content</html>')
    });

    require('../background.js');
    messageListener({ action: 'fetchPage', url: 'https://test.com' }, {}, mockSendResponse);

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockSendResponse).toHaveBeenCalledWith({
      success: true,
      html: '<html>Content</html>'
    });
  });

  test('should handle fetch errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    require('../background.js');
    messageListener({ action: 'fetchPage', url: 'https://fail.com' }, {}, mockSendResponse);

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockSendResponse).toHaveBeenCalledWith({
      success: false,
      error: 'Network error'
    });
  });

  test('should include User-Agent header', async () => {
    mockFetch.mockResolvedValue({
      text: () => Promise.resolve('<html></html>')
    });

    require('../background.js');
    messageListener({ action: 'fetchPage', url: 'https://example.com' }, {}, mockSendResponse);

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': expect.stringContaining('Mozilla')
        })
      })
    );
  });
});
