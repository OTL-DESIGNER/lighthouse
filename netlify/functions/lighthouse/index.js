const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Helper function to format URLs consistently
const formatUrl = (rawUrl) => {
  try {
    // Remove whitespace and ensure lowercase
    let url = rawUrl.trim().toLowerCase();
    
    // Remove any protocol and www. prefix if they exist
    url = url.replace(/^(https?:\/\/)?(www\.)?/, '');
    
    // Add https protocol
    return `https://${url}`;
  } catch (error) {
    throw new Error('Invalid URL format');
  }
};

// Helper function to format scores
const formatScore = (score) => score ? Math.round(score * 100) : 'N/A';

exports.handler = async (event, context) => {
  // Standard CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Ensure GET request
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Validate URL parameter exists
  const rawUrl = event.queryStringParameters?.url;
  if (!rawUrl) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'URL parameter is required' })
    };
  }

  try {
    // Format and validate the URL
    const url = formatUrl(rawUrl);
    
    // Verify API key exists
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
      throw new Error('API configuration error');
    }

    // Common parameters for both requests
    const baseParams = new URLSearchParams({
      key: API_KEY,
      category: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa']
    });

    // Create API URLs
    const createApiUrl = (strategy) => 
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${baseParams}&url=${encodeURIComponent(url)}&strategy=${strategy}`;

    // Fetch both mobile and desktop data
    console.log(`Starting analysis for ${url}`);
    const [mobileResponse, desktopResponse] = await Promise.all([
      fetch(createApiUrl('mobile')),
      fetch(createApiUrl('desktop'))
    ]);

    // Handle API errors
    if (!mobileResponse.ok || !desktopResponse.ok) {
      throw new Error('PageSpeed API request failed');
    }

    // Parse responses
    const [mobileData, desktopData] = await Promise.all([
      mobileResponse.json(),
      desktopResponse.json()
    ]);

    // Validate responses have lighthouse results
    if (!mobileData.lighthouseResult || !desktopData.lighthouseResult) {
      throw new Error('Invalid PageSpeed API response');
    }

    // Extract and format scores
    const getScores = (data) => ({
      performance: formatScore(data.lighthouseResult.categories.performance?.score),
      accessibility: formatScore(data.lighthouseResult.categories.accessibility?.score),
      bestPractices: formatScore(data.lighthouseResult.categories['best-practices']?.score),
      seo: formatScore(data.lighthouseResult.categories.seo?.score),
      pwa: formatScore(data.lighthouseResult.categories.pwa?.score)
    });

    // Format final results
    const results = {
      mobile: getScores(mobileData),
      desktop: getScores(desktopData),
      url: url // Include the formatted URL in response
    };

    console.log(`Analysis complete for ${url}`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('Lighthouse test error:', error);
    
    // Determine appropriate error message and status code
    let statusCode = 500;
    let message = 'An error occurred while analyzing the website';

    if (error.message.includes('Invalid URL')) {
      statusCode = 400;
      message = 'Please enter a valid website URL (e.g., example.com)';
    } else if (error.message.includes('API')) {
      statusCode = 503;
      message = 'Service temporarily unavailable, please try again later';
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};