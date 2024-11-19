const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Helper function to format URL
const formatUrl = (url) => {
  // Remove leading/trailing whitespace
  url = url.trim();
  
  // Remove any existing protocol and www
  url = url.replace(/^(https?:\/\/)?(www\.)?/, '');
  
  // Add https protocol
  return `https://${url}`;
};

// Helper function to format score
const formatScore = (score) => score ? Math.round(score * 100) : 'N/A';

exports.handler = async (event, context) => {
  // Standard headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle non-GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check for URL parameter
  if (!event.queryStringParameters?.url) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'URL parameter is required' })
    };
  }

  try {
    // Format and validate URL
    const url = formatUrl(event.queryStringParameters.url);
    
    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Please enter a valid website URL (e.g., example.com)' })
      };
    }

    // Check for API key
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
      throw new Error('API key not configured');
    }

    // Construct API URLs
    const baseParams = `key=${API_KEY}&category=performance&category=accessibility&category=best-practices&category=seo&category=pwa`;
    const mobileApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&${baseParams}&strategy=mobile`;
    const desktopApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&${baseParams}&strategy=desktop`;

    // Fetch both mobile and desktop results
    const [mobileResponse, desktopResponse] = await Promise.all([
      fetch(mobileApiUrl),
      fetch(desktopApiUrl)
    ]);

    // Check for API response errors
    if (!mobileResponse.ok || !desktopResponse.ok) {
      throw new Error('Failed to fetch PageSpeed Insights data');
    }

    // Parse JSON responses
    const [mobileData, desktopData] = await Promise.all([
      mobileResponse.json(),
      desktopResponse.json()
    ]);

    // Validate lighthouse results exist
    if (!mobileData.lighthouseResult || !desktopData.lighthouseResult) {
      throw new Error('Invalid response from PageSpeed Insights API');
    }

    // Format the results
    const results = {
      mobile: {
        performance: formatScore(mobileData.lighthouseResult.categories.performance?.score),
        accessibility: formatScore(mobileData.lighthouseResult.categories.accessibility?.score),
        bestPractices: formatScore(mobileData.lighthouseResult.categories['best-practices']?.score),
        seo: formatScore(mobileData.lighthouseResult.categories.seo?.score),
        pwa: formatScore(mobileData.lighthouseResult.categories.pwa?.score)
      },
      desktop: {
        performance: formatScore(desktopData.lighthouseResult.categories.performance?.score),
        accessibility: formatScore(desktopData.lighthouseResult.categories.accessibility?.score),
        bestPractices: formatScore(desktopData.lighthouseResult.categories['best-practices']?.score),
        seo: formatScore(desktopData.lighthouseResult.categories.seo?.score),
        pwa: formatScore(desktopData.lighthouseResult.categories.pwa?.score)
      }
    };

    // Return successful response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };

  } catch (error) {
    // Log error for debugging
    console.error('Lighthouse test error:', error);

    // Return error response
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'An error occurred while running the test',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};