// lighthouse/index.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Improved timeout wrapper with retry logic
const fetchWithRetry = async (url, options = {}, maxRetries = 2, timeout = 29000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log(`Attempt ${attempt + 1} failed:`, errorData);
        
        // Check for rate limiting
        if (response.status === 429) {
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
            continue;
          }
        }
        throw new Error(`API request failed: ${response.status} ${errorData.error?.message || ''}`);
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) {
        clearTimeout(timeoutId);
        throw error;
      }
      console.log(`Retry attempt ${attempt + 1}:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    let url = event.queryStringParameters?.url;
    if (!url) {
      throw new Error('URL is required');
    }

    // Normalize URL
    url = url.trim().toLowerCase();
    if (!url.match(/^https?:\/\//)) {
      url = `https://${url.replace(/^(https?:\/\/)?(www\.)?/, '')}`;
    }

    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
      throw new Error('API key not configured');
    }

    const baseParams = `key=${API_KEY}&category=performance&category=accessibility&category=best-practices&category=seo`;
    const mobileUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&${baseParams}&strategy=mobile`;
    const desktopUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&${baseParams}&strategy=desktop`;

    console.log('Starting test for:', url);

    // Run tests in parallel with retry logic
    const [mobileRes, desktopRes] = await Promise.all([
      fetchWithRetry(mobileUrl),
      fetchWithRetry(desktopUrl)
    ]);

    const [mobileData, desktopData] = await Promise.all([
      mobileRes.json(),
      desktopRes.json()
    ]);

    if (!mobileData.lighthouseResult || !desktopData.lighthouseResult) {
      throw new Error('Invalid API response structure');
    }

    const formatScore = (score) => Math.round((score || 0) * 100);

    const results = {
      url,
      mobile: {
        performance: formatScore(mobileData.lighthouseResult.categories.performance?.score),
        accessibility: formatScore(mobileData.lighthouseResult.categories.accessibility?.score),
        bestPractices: formatScore(mobileData.lighthouseResult.categories['best-practices']?.score),
        seo: formatScore(mobileData.lighthouseResult.categories.seo?.score)
      },
      desktop: {
        performance: formatScore(desktopData.lighthouseResult.categories.performance?.score),
        accessibility: formatScore(desktopData.lighthouseResult.categories.accessibility?.score),
        bestPractices: formatScore(desktopData.lighthouseResult.categories['best-practices']?.score),
        seo: formatScore(desktopData.lighthouseResult.categories.seo?.score)
      }
    };

    // Update progress map
    const progressMap = global.progressMap || new Map();
    progressMap.set(url, 100);

    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify(results) 
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to analyze website. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};