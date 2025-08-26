const { reelify } = require('../services/reelifyService');

const reelifyController = async (req, res) => {
    const { ytUrl } = req.body;
    if (!ytUrl) {
        return res.status(400).json({ message: 'YouTube URL is required' });
    }

    try {
        await reelify(ytUrl);
        res.status(200).json({ message: 'Reelify process started' });
    } catch (error) {
        res.status(500).json({ message: 'Error during reelify process', error: error.message });
    }
};

module.exports = { reelifyController };
