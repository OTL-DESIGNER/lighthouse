    // Get all necessary DOM elements
    const form = document.getElementById('lighthouse-form');
    const results = document.getElementById('results');
    const modal = document.getElementById('loading-modal');
    const mobileResults = document.getElementById('mobile-results');
    const desktopResults = document.getElementById('desktop-results');
    const mobileTab = document.getElementById('mobile-tab');
    const desktopTab = document.getElementById('desktop-tab');

    // Performance facts array - business and conversion focused
    const performanceFacts = [
        "A 1-second delay in page load time can lead to a 7% drop in conversions",
        "Slow-loading websites lose $2.6 billion in sales annually due to visitor abandonment",
        "46% of users don't revisit poorly performing websites, directly impacting customer retention",
        "Pages that load within 5 seconds have 70% longer average sessions, leading to better engagement",
        "Websites that load in under 2 seconds have an average conversion rate of 37%, compared to 3% for sites that take 5+ seconds",
        "Google confirms that site speed is a direct ranking factor - slower sites rank lower in search results",
        "74% of users will abandon mobile sites that take longer than 5 seconds to load, affecting mobile conversion rates",
        "Amazon found that every 100ms of latency cost them 1% in sales - speed directly impacts revenue",
        "Fast-loading sites appear more professional, with 88% of users less likely to return after a bad experience",
        "E-commerce sites that improved load times by 1 second saw a 27% increase in conversion rate",
        "Mobile users are 5x more likely to abandon a purchase if the site isn't optimized",
        "Bounce rates increase by 103% when page load time goes from 1 to 6 seconds"
    ];

    // Track shown facts to prevent repetition
 // Performance facts management
const FACT_CHANGE_INTERVAL = 5000; // 5 seconds per fact


function getNextFact() {
    const unusedFacts = performanceFacts.filter(fact => !usedFacts.has(fact));
    if (unusedFacts.length === 0) {
        usedFacts.clear();
        return performanceFacts[0];
    }
    const nextFact = unusedFacts[Math.floor(Math.random() * unusedFacts.length)];
    usedFacts.add(nextFact);
    return nextFact;
}

function startFactRotation() {
    const factDisplay = document.getElementById('fact-display');
    
    // Show first fact immediately
    factDisplay.style.opacity = '1';
    factDisplay.textContent = getNextFact();
    
    // Set up periodic fact changes
    factChangeTimer = setInterval(() => {
        factDisplay.style.opacity = '0';
        setTimeout(() => {
            factDisplay.textContent = getNextFact();
            factDisplay.style.opacity = '1';
        }, 500);
    }, FACT_CHANGE_INTERVAL);
}

function stopFactRotation() {
    if (factChangeTimer) {
        clearInterval(factChangeTimer);
        factChangeTimer = null;
    }
}

// Progress bar animation
// Progress bar animation
let hasResults = false;
let progressCheckInterval = null;
let progressAnimationFrame = null;
let currentProgress = 0;
let targetProgress = 0;
let factChangeTimer = null;
let usedFacts = new Set();


// Add these new functions
function disableCardClicks() {
    document.querySelectorAll('.card').forEach(card => {
        card.style.pointerEvents = 'none';
        card.classList.remove('cursor-pointer');
        card.classList.add('opacity-50');
        // Remove event listeners
        card.removeEventListener('click', handleCardClick);
    });
}

function enableCardClicks() {
    document.querySelectorAll('.card').forEach(card => {
        card.style.pointerEvents = 'auto';
        card.classList.add('cursor-pointer');
        card.classList.remove('opacity-50');
        // Add event listeners back
        card.addEventListener('click', handleCardClick);
    });
}
// Separate the card click handler
function handleCardClick(e) {
    if (!hasResults) return;
    const card = e.currentTarget;
    showModal(card);
}

function animateProgress() {
    if (currentProgress < targetProgress) {
        // Smoother acceleration with smaller steps
        const diff = targetProgress - currentProgress;
        const step = Math.max(0.1, Math.min(1, diff * 0.05));
        currentProgress += step;
        
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        
        if (progressBar && progressText) {
            progressBar.style.width = `${currentProgress}%`;
            progressText.textContent = `${Math.round(currentProgress)}%`;
        }
        
        progressAnimationFrame = requestAnimationFrame(animateProgress);
    } else if (currentProgress >= targetProgress) {
        cancelAnimationFrame(progressAnimationFrame);
        progressAnimationFrame = null;
    }
}

function updateLoadingModal(progress) {
    targetProgress = progress;
    if (!progressAnimationFrame && currentProgress < targetProgress) {
        progressAnimationFrame = requestAnimationFrame(animateProgress);
    }
}

async function runLighthouseTest(url) {
    // Reset progress
    currentProgress = 0;
    targetProgress = 0;
    usedFacts.clear();
    
    if (progressAnimationFrame) {
        cancelAnimationFrame(progressAnimationFrame);
        progressAnimationFrame = null;
    }

    // Show modal
    modal.classList.remove('hidden');
    document.querySelector('.loading-spinner').style.display = 'block';
    startFactRotation();
    updateLoadingModal(0);

    let testComplete = false;
    let lastProgress = 0;

    // Progress checking
    const progressCheck = setInterval(async () => {
        if (!testComplete) {
            try {
                const response = await fetch(`/.netlify/functions/lighthouse-status?url=${encodeURIComponent(url)}`);
                if (response.ok) {
                    const status = await response.json();
                    if (status.progress !== undefined && status.progress !== lastProgress) {
                        lastProgress = status.progress;
                        updateLoadingModal(status.progress);
                    }
                }
            } catch (err) {
                console.warn('Progress check error:', err);
            }
        }
    }, 250);

    try {
        const response = await fetch(`/.netlify/functions/lighthouse?url=${encodeURIComponent(url)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to run test');
        }

        const data = await response.json();
        updateLoadingModal(100);

        return {
            mobile: {
                performance: data.mobile.performance || 0,
                accessibility: data.mobile.accessibility || 0,
                bestPractices: data.mobile.bestPractices || 0,
                seo: data.mobile.seo || 0
            },
            desktop: {
                performance: data.desktop.performance || 0,
                accessibility: data.desktop.accessibility || 0,
                bestPractices: data.desktop.bestPractices || 0,
                seo: data.desktop.seo || 0
            }
        };
    } catch (err) {
        console.error('Test error:', err);
        throw new Error('Failed to analyze website. Please try again.');
    }
}


 

  // Form submit handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const errorMessage = document.getElementById('error-message');
    errorMessage.classList.add('hidden');
    
    let url = document.getElementById('url').value.trim();
    if (!url) {
        errorMessage.textContent = 'Please enter a valid URL';
        errorMessage.classList.remove('hidden');
        return;
    }

    try {
        // Reset state
        hasResults = false;
        disableCardClicks();
        url = url.replace(/^(https?:\/\/)?(www\.)?/, '');
        
        // Hide the form and show consultation button
        const formContainer = document.getElementById('lighthouse-form');
        if (formContainer) {
            formContainer.style.display = 'none';
        }

        // Add "Book a Free Consultation" button if not exists
        const heroSection = document.querySelector('.bg-gradient-to-br');
        if (heroSection && !document.getElementById('book-consultation-btn')) {
            const bookButton = document.createElement('a');
            bookButton.id = 'book-consultation-btn';
            bookButton.href = 'https://ontoplocal.com/designer';
            bookButton.target = '_blank';
            bookButton.textContent = 'Book a Free Consultation';
            bookButton.className = 'inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors';
            heroSection.appendChild(bookButton);
        }

        // Show loading state
        modal.classList.remove('hidden');
        document.querySelector('.loading-spinner').style.display = 'block';
        startFactRotation();
        updateLoadingModal(0);
        results.style.opacity = '0';

        // Run the test
        const data = await runLighthouseTest(url);
        
        // Validate the data structure
        if (!data || !data.mobile || !data.desktop) {
            throw new Error('Invalid response data structure');
        }

        // Log the data for debugging
        console.log('Test data received:', data);
        console.log('Mobile data:', data.mobile);
        console.log('Desktop data:', data.desktop);

        // Ensure all required scores exist
        const requiredMetrics = ['performance', 'accessibility', 'bestPractices', 'seo'];
        for (const device of ['mobile', 'desktop']) {
            for (const metric of requiredMetrics) {
                if (typeof data[device][metric] === 'undefined') {
                    data[device][metric] = 0;
                }
            }
        }

        // Update UI
        updateScores(data);
        results.style.opacity = '1';
        
        // Enable card interactions
        hasResults = true;
        enableCardClicks();
        
        // Hide loading state
        modal.classList.add('hidden');
        stopFactRotation();

    } catch (err) {
        console.error('Test error:', err);
        errorMessage.textContent = err.message || 'An error occurred while testing the website';
        errorMessage.classList.remove('hidden');
        modal.classList.add('hidden');
        stopFactRotation();
        
        // Show the form again on error
        const formContainer = document.getElementById('lighthouse-form');
        if (formContainer) {
            formContainer.style.display = 'block';
        }

        // Reset all states
        hasResults = false;
        disableCardClicks();
        
        // Reset scores
        const categories = ['performance', 'accessibility', 'bestPractices', 'seo'];
        categories.forEach(category => {
            ['mobile', 'desktop'].forEach(device => {
                const scoreElement = document.getElementById(`${device}-${category}`);
                const barElement = document.getElementById(`${device}-${category}-bar`);
                if (scoreElement) scoreElement.textContent = '-';
                if (barElement) {
                    barElement.style.width = '0%';
                    barElement.className = 'score-bar h-full'; // Reset color classes
                }
            });
        });
    } finally {
        // Cleanup any intervals or animations that might be running
        if (progressCheckInterval) {
            clearInterval(progressCheckInterval);
        }
        if (progressAnimationFrame) {
            cancelAnimationFrame(progressAnimationFrame);
            progressAnimationFrame = null;
        }
    }
});


    // Tab switching functionality
    desktopTab.addEventListener('click', () => {
        mobileTab.classList.remove('border-b-2', 'border-blue-600', 'text-blue-600');
        desktopTab.classList.add('border-b-2', 'border-blue-600', 'text-blue-600');
        mobileResults.style.display = 'none';
        desktopResults.style.display = 'grid';
    });

    mobileTab.addEventListener('click', () => {
        desktopTab.classList.remove('border-b-2', 'border-blue-600', 'text-blue-600');
        mobileTab.classList.add('border-b-2', 'border-blue-600', 'text-blue-600');
        desktopResults.style.display = 'none';
        mobileResults.style.display = 'grid';
    });

    // score card suggestions

const suggestions = {
    performance: {
        poor: {
            title: "Critical Performance Issues",
            tips: [
                "• Optimize and compress all images",
                "• Remove render-blocking resources",
                "• Reduce server response time",
                "• Minimize JavaScript execution",
                "• Enable text compression"
            ]
        },
        fair: {
            title: "Performance Improvements Needed",
            tips: [
                "• Implement lazy loading",
                "• Optimize critical rendering path",
                "• Use a CDN for assets",
                "• Cache static resources",
                "• Reduce unused JavaScript"
            ]
        },
        good: {
            title: "Good Performance",
            tips: [
                "• Monitor Core Web Vitals",
                "• Implement performance budgets",
                "• Consider preloading key resources",
                "• Optimize new features",
                "• Regular performance testing"
            ]
        }
    },
    accessibility: {
        poor: {
            title: "Critical Accessibility Issues",
            tips: [
                "• Add missing image alt text",
                "• Fix color contrast issues",
                "• Add proper form labels",
                "• Ensure keyboard navigation",
                "• Implement ARIA labels"
            ]
        },
        fair: {
            title: "Accessibility Needs Work",
            tips: [
                "• Improve heading structure",
                "• Enhance focus indicators",
                "• Add skip navigation links",
                "• Improve form error messages",
                "• Test with screen readers"
            ]
        },
        good: {
            title: "Good Accessibility",
            tips: [
                "• Regular accessibility audits",
                "• Maintain ARIA implementation",
                "• Keep testing with assistive tech",
                "• Document accessibility features",
                "• Monitor user feedback"
            ]
        }
    },
    bestPractices: {
        poor: {
            title: "Critical Best Practice Issues",
            tips: [
                "• Update outdated libraries",
                "• Fix console errors",
                "• Implement HTTPS",
                "• Add error handling",
                "• Fix browser compatibility issues"
            ]
        },
        fair: {
            title: "Best Practices Need Work",
            tips: [
                "• Improve error handling",
                "• Update dependencies",
                "• Implement security headers",
                "• Add service worker",
                "• Optimize image aspects"
            ]
        },
        good: {
            title: "Good Best Practices",
            tips: [
                "• Keep libraries updated",
                "• Monitor security headers",
                "• Regular security audits",
                "• Maintain clean console",
                "• Document coding standards"
            ]
        }
    },
    seo: {
        poor: {
            title: "Critical SEO Issues",
            tips: [
                "• Add meta descriptions",
                "• Fix missing title tags",
                "• Make site mobile-friendly",
                "• Add structured data",
                "• Fix broken links"
            ]
        },
        fair: {
            title: "SEO Needs Improvement",
            tips: [
                "• Optimize meta descriptions",
                "• Improve URL structure",
                "• Enhance content quality",
                "• Add more structured data",
                "• Improve internal linking"
            ]
        },
        good: {
            title: "Good SEO Practices",
            tips: [
                "• Monitor search performance",
                "• Keep content fresh",
                "• Maintain site structure",
                "• Regular SEO audits",
                "• Track user engagement"
            ]
        }
    }
};

// Helper function to get suggestions based on score
function getSuggestions(category, score) {
    let level;
    if (score < 50) level = 'poor';
    else if (score < 90) level = 'fair';
    else level = 'good';
    
    return suggestions[category][level];
}


function showModal(card) {
    if (!hasResults) return;

    try {
        const category = card.dataset.category;
        const device = card.closest('#mobile-results') ? 'mobile' : 'desktop';
        const scoreElement = document.getElementById(`${device}-${category}`);
        const score = parseInt(scoreElement?.textContent) || 0;

        const suggestionData = getSuggestions(category, score);
        if (!suggestionData) return;

        const modalTitle = document.getElementById('modal-title');
        const modalScore = document.getElementById('modal-score');
        const modalLevel = document.getElementById('modal-level');
        const modalSuggestions = document.getElementById('modal-suggestions');

        if (!modalTitle || !modalScore || !modalLevel || !modalSuggestions) {
            console.error('Modal elements not found');
            return;
        }

        modalTitle.textContent = suggestionData.title;
        modalScore.textContent = `Score: ${score}`;
        
        const level = score < 50 ? 'Poor' : score < 90 ? 'Fair' : 'Good';
        modalLevel.textContent = level;
        modalLevel.className = `score-level ${level.toLowerCase()}`;
        
        modalSuggestions.innerHTML = suggestionData.tips
            .map(tip => `<li class="flex items-start"><span class="mr-2">•</span>${tip.replace('• ', '')}</li>`)
            .join('');

        const modal = document.getElementById('info-modal');
        if (modal) modal.classList.remove('hidden');
    } catch (error) {
        console.error('Error showing modal:', error);
    }
}


// Update card click handlers
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => showModal(card));
});

// Add modal close handlers
document.getElementById('close-info-modal').addEventListener('click', closeInfoModal);

// Close modal when clicking outside
document.getElementById('info-modal').addEventListener('click', (e) => {
    if (e.target.id === 'info-modal') {
        closeInfoModal();
    }
});

// Add escape key handler
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeInfoModal();
    }
});

// Modal close function
function closeInfoModal() {
    const modal = document.getElementById('info-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}


function updateScoreCard(category, score, device) {
    try {
        const scoreElement = document.getElementById(`${device}-${category}`);
        const barElement = document.getElementById(`${device}-${category}-bar`);
        
        if (!scoreElement || !barElement) {
            console.error(`Elements not found for ${device}-${category}`);
            return;
        }

        const formattedScore = typeof score === 'number' ? Math.round(score) : 0;
        
        // Update score display
        scoreElement.textContent = `${formattedScore}%`;
        
        // Remove existing color classes
        barElement.classList.remove('bg-red-600', 'bg-yellow-500', 'bg-green-600', 'bg-blue-600');
        scoreElement.classList.remove('text-red-600', 'text-yellow-600', 'text-green-600', 'text-blue-600');
        
        // Add appropriate color class based on score
        if (formattedScore < 50) {
            barElement.classList.add('bg-red-600');
            scoreElement.classList.add('text-red-600');
        } else if (formattedScore < 90) {
            barElement.classList.add('bg-yellow-500');
            scoreElement.classList.add('text-yellow-600');
        } else {
            barElement.classList.add('bg-green-600');
            scoreElement.classList.add('text-green-600');
        }
        
        // Update width with a small delay to ensure smooth animation
        setTimeout(() => {
            barElement.style.width = `${formattedScore}%`;
        }, 50);
    } catch (error) {
        console.error('Error updating score card:', error);
    }
}

function initializeInterface() {
    // Disable cards initially
    disableCardClicks();
    
    // Initialize tabs
    const mobileTab = document.getElementById('mobile-tab');
    const desktopTab = document.getElementById('desktop-tab');
    const mobileResults = document.getElementById('mobile-results');
    const desktopResults = document.getElementById('desktop-results');

    mobileTab.addEventListener('click', () => switchTab('mobile', { mobileTab, desktopTab, mobileResults, desktopResults }));
    desktopTab.addEventListener('click', () => switchTab('desktop', { mobileTab, desktopTab, mobileResults, desktopResults }));
}

// Update the document ready handler:
document.addEventListener('DOMContentLoaded', initializeInterface);

function switchTab(activeTab, elements) {
    const { mobileTab, desktopTab, mobileResults, desktopResults } = elements;
    const isDesktop = activeTab === 'desktop';
    
    mobileTab.classList.toggle('text-blue-600', !isDesktop);
    mobileTab.classList.toggle('border-blue-600', !isDesktop);
    mobileTab.classList.toggle('text-gray-500', isDesktop);
    mobileTab.classList.toggle('border-transparent', isDesktop);
    
    desktopTab.classList.toggle('text-blue-600', isDesktop);
    desktopTab.classList.toggle('border-blue-600', isDesktop);
    desktopTab.classList.toggle('text-gray-500', !isDesktop);
    desktopTab.classList.toggle('border-transparent', !isDesktop);
    
    mobileResults.style.display = isDesktop ? 'none' : 'grid';
    desktopResults.style.display = isDesktop ? 'grid' : 'none';

}
// Reset function
function resetUI() {
    hasResults = false;
    disableCardClicks();
    
    const categories = ['performance', 'accessibility', 'bestPractices', 'seo'];
    categories.forEach(category => {
        ['mobile', 'desktop'].forEach(device => {
            const scoreElement = document.getElementById(`${device}-${category}`);
            const barElement = document.getElementById(`${device}-${category}-bar`);
            if (scoreElement) scoreElement.textContent = '-';
            if (barElement) {
                barElement.style.width = '0%';
                barElement.className = 'score-bar h-full';
            }
        });
    });
}


// Update scores for both mobile and desktop
function updateScores(data) {
    const categories = ['performance', 'accessibility', 'bestPractices', 'seo'];
    
    categories.forEach(category => {
        ['mobile', 'desktop'].forEach(device => {
            if (data[device] && typeof data[device][category] !== 'undefined') {
                updateScoreCard(category, data[device][category], device);
            }
        });
    });
}

// Update the DOMContentLoaded handler
document.addEventListener('DOMContentLoaded', () => {
    initializeInterface();
    resetUI();
});

// Remove the existing card click event listeners
document.querySelectorAll('.card').forEach(card => {
    card.removeEventListener('click', showModal);
});