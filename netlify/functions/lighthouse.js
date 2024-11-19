import fetch from 'node-fetch';

// Track test progress
const testProgress = new Map();

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const url = event.queryStringParameters.url;
  
  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL is required' }),
    };
  }

  try {
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
      throw new Error('API key not configured');
    }

    const mobileApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      url
    )}&key=${API_KEY}&category=performance&category=accessibility&category=best-practices&category=seo&category=pwa&strategy=mobile`;
    
    const desktopApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      url
    )}&key=${API_KEY}&category=performance&category=accessibility&category=best-practices&category=seo&category=pwa&strategy=desktop`;

    const [mobileResponse, desktopResponse] = await Promise.all([
      fetch(mobileApiUrl),
      fetch(desktopApiUrl)
    ]);

    const [mobileData, desktopData] = await Promise.all([
      mobileResponse.json(),
      desktopResponse.json()
    ]);

    const formatScore = (score) => score ? Math.round(score * 100) : 'N/A';

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

    return {
      statusCode: 200,
      body: JSON.stringify(results)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};