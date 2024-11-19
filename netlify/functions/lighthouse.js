import fetch from 'node-fetch';

let testProgress = new Map();

// Helper function to get progress
const getProgress = (url) => {
  return testProgress.get(url) || 0;
};

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

  const API_KEY = process.env.API_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured' }),
    };
  }

  try {
    // Your existing lighthouse test code here, modified for serverless:
    testProgress.set(url, 0);

    const startProgressUpdates = (currentValue, maxValue) => {
      let progress = currentValue;
      const interval = setInterval(() => {
        if (progress < maxValue) {
          progress += 0.5;
          testProgress.set(url, progress);
        }
      }, 250);
      return interval;
    };

    let progressInterval = startProgressUpdates(0, 10);

    const mobileApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      url
    )}&key=${API_KEY}&category=performance&category=accessibility&category=best-practices&category=seo&category=pwa&strategy=mobile`;
    
    const desktopApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      url
    )}&key=${API_KEY}&category=performance&category=accessibility&category=best-practices&category=seo&category=pwa&strategy=desktop`;

    clearInterval(progressInterval);
    testProgress.set(url, 10);
    progressInterval = startProgressUpdates(10, 60);

    const [mobileResponse, desktopResponse] = await Promise.all([
      fetch(mobileApiUrl),
      fetch(desktopApiUrl)
    ]);

    // Rest of your existing code...
    
    return {
      statusCode: 200,
      body: JSON.stringify(results),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};