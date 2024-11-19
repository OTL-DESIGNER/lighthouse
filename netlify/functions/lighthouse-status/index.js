// Track progress across function calls
const PROGRESS_STEP = 5;
let lastUpdate = Date.now();
let progress = 0;

exports.handler = async (event, context) => {
  const currentTime = Date.now();
  const timeElapsed = currentTime - lastUpdate;

  // Only update progress if enough time has passed
  if (timeElapsed > 1000) { // 1 second
    progress = Math.min(progress + PROGRESS_STEP, 95);
    lastUpdate = currentTime;
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify({ progress })
  };
};