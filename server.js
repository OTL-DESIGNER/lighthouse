import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const API_KEY = process.env.API_KEY;

// Validate API key on startup
if (!API_KEY) {
    console.error('API_KEY is missing from the environment variables!');
    process.exit(1);
}

// Track test progress
const testProgress = new Map();

// Middleware for static files
app.use(express.static(__dirname));

// Root endpoint to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Status endpoint for progress tracking
app.get('/lighthouse-status', (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    const progress = testProgress.get(url) || 0;
    res.json({ progress });
});

// Main Lighthouse testing endpoint
app.get('/run-lighthouse', async (req, res) => {
    const url = req.query.url;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    testProgress.set(url, 0);

    try {
        // Helper function for continuous progress updates
        const startProgressUpdates = (currentValue, maxValue, interval = 250) => {
            let progress = currentValue;
            return setInterval(() => {
                if (progress < maxValue) {
                    progress += 0.5;
                    testProgress.set(url, progress);
                }
            }, interval);
        };

        // Initialize progress (0-10%)
        testProgress.set(url, 0);
        let progressInterval = startProgressUpdates(0, 10);

        // Start API calls
        console.log(`Starting tests for ${url}`);
        const mobileApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
            url
        )}&key=${API_KEY}&category=performance&category=accessibility&category=best-practices&category=seo&category=pwa&strategy=mobile`;
        
        const desktopApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
            url
        )}&key=${API_KEY}&category=performance&category=accessibility&category=best-practices&category=seo&category=pwa&strategy=desktop`;

        // Clear first interval and start progress for API calls (10-60%)
        clearInterval(progressInterval);
        testProgress.set(url, 10);
        progressInterval = startProgressUpdates(10, 60);

        // Fetch results
        const [mobileResponse, desktopResponse] = await Promise.all([
            fetch(mobileApiUrl),
            fetch(desktopApiUrl)
        ]);

        // Clear interval and update progress for processing (60-80%)
        clearInterval(progressInterval);
        testProgress.set(url, 60);
        progressInterval = startProgressUpdates(60, 80);

        if (!mobileResponse.ok || !desktopResponse.ok) {
            throw new Error('Failed to fetch results from PageSpeed Insights API');
        }

        const [mobileData, desktopData] = await Promise.all([
            mobileResponse.json(),
            desktopResponse.json()
        ]);

        // Clear interval and start final processing (80-95%)
        clearInterval(progressInterval);
        testProgress.set(url, 80);
        progressInterval = startProgressUpdates(80, 95);

        // Validate responses
        if (!mobileData.lighthouseResult || !desktopData.lighthouseResult) {
            throw new Error('Invalid response from PageSpeed Insights API');
        }

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

        // Complete the progress
        clearInterval(progressInterval);
        testProgress.set(url, 100);

        // Send response
        res.json(results);

        // Clean up progress tracking
        setTimeout(() => {
            testProgress.delete(url);
        }, 2000);

    } catch (err) {
        // Ensure interval is cleared on error
        if (progressInterval) {
            clearInterval(progressInterval);
        }
        console.error('Error running Lighthouse test:', err);
        testProgress.delete(url);
        res.status(500).json({ 
            error: 'Failed to run Lighthouse test',
            details: err.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        details: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('API Key status:', API_KEY ? 'Loaded' : 'Missing');
});