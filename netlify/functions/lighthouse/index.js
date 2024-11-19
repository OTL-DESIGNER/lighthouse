const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Get and validate URL
    let url = event.queryStringParameters?.url;
    if (!url) {
      throw new Error('URL is required');
    }

    // Clean and format URL
    url = url.trim().toLowerCase();
    url = url.replace(/^(https?:\/\/)?(www\.)?/, '');
    url = `https://${url}`;

    // Validate API key
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
      console.error('API key missing');
      throw new Error('Service configuration error');
    }

    // Build API URLs
    const baseUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
    const baseParams = `key=${API_KEY}&category=performance&category=accessibility&category=best-practices&category=seo&category=pwa`;
    
    const mobileUrl = `${baseUrl}?url=${encodeURIComponent(url)}&${baseParams}&strategy=mobile`;
    const desktopUrl = `${baseUrl}?url=${encodeURIComponent(url)}&${baseParams}&strategy=desktop`;

    console.log('Testing URL:', url);

    // Fetch data
    const [mobileRes, desktopRes] = await Promise.all([
      fetch(mobileUrl).then(res => {
        if (!res.ok) throw new Error(`Mobile API error: ${res.status}`);
        return res.json();
      }),
      fetch(desktopUrl).then(res => {
        if (!res.ok) throw new Error(`Desktop API error: ${res.status}`);
        return res.json();
      })
    ]);

    // Validate responses
    if (!mobileRes.lighthouseResult || !desktopRes.lighthouseResult) {
      throw new Error('Invalid API response');
    }

    // Format scores
    const formatScore = score => score ? Math.round(score * 100) : 'N/A';
    const getScores = (data) => ({
      performance: formatScore(data.lighthouseResult.categories.performance?.score),
      accessibility: formatScore(data.lighthouseResult.categories.accessibility?.score),
      bestPractices: formatScore(data.lighthouseResult.categories['best-practices']?.score),
      seo: formatScore(data.lighthouseResult.categories.seo?.score),
      pwa: formatScore(data.lighthouseResult.categories.pwa?.score)
    });

    // Build response
    const results = {
      url,
      mobile: getScores(mobileRes),
      desktop: getScores(desktopRes)
    };

    console.log('Analysis complete:', url);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('Function error:', error);

    // Determine appropriate error message
    let message = 'An error occurred while analyzing the website';
    let statusCode = 500;

    if (error.message.includes('API error')) {
      message = 'Unable to analyze website. Please try again later.';
      statusCode = 503;
    } else if (error.message.includes('URL')) {
      message = 'Please enter a valid website URL';
      statusCode = 400;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: message,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};