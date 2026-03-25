const { PostHog } = require('posthog-node');

// PostHog client ko .env ki keys se zinda kar rahe hain
const posthog = new PostHog(process.env.POSTHOG_API_KEY, {
  host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
  flushAt: 1, // Development ke liye: Taake event fauran dashboard pe chala jaye, wait na kare
  flushInterval: 1000
});

module.exports = posthog;