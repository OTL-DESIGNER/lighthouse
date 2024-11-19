export const handler = async (event) => {
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }
  
    return {
      statusCode: 200,
      body: JSON.stringify({ progress: Math.floor(Math.random() * 100) })
    };
  };