// lighthouse-status/index.js
const progressMap = new Map();

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
    const url = event.queryStringParameters?.url;
    if (!url) {
      throw new Error('URL parameter required');
    }

    // Get or initialize progress
    let progress = progressMap.get(url) || 0;
    
    // More gradual progress increments
    if (progress < 30) progress += 3;
    else if (progress < 60) progress += 2;
    else if (progress < 90) progress += 1;
    else progress = Math.min(95, progress + 0.5);
    
    progressMap.set(url, progress);

    // Cleanup old entries after 3 minutes
    setTimeout(() => progressMap.delete(url), 180000);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ progress })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
