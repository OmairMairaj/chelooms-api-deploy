const searchService = require('../services/searchService');

class SearchController {
    async globalSearch(req, res) {
        try {
            // URL se `q` query parameter nikalna (e.g., /api/search?q=silk)
            const { q } = req.query;

            const results = await searchService.globalSiteSearch(q);

            res.status(200).json({
                success: true,
                message: "Search completed successfully",
                data: results
            });
        } catch (error) {
            console.error("Global Search Error:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new SearchController();