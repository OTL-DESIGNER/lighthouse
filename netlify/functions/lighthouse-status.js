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
  
    const progress = getProgress(url) || 0;
  
    return {
      statusCode: 200,
      body: JSON.stringify({ progress }),
    };
  };