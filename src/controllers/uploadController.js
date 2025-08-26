const { upload } = require('../services/uploadService');

const uploadController = async (req, res) => {
    const { tunnelUrl } = req.app.locals; 
    if (!tunnelUrl) {
        return res.status(500).json({ message: 'LocalTunnel URL not available. Please restart the server.' });
    }

    try {
        await upload(tunnelUrl);
        res.status(200).json({ message: 'Upload process started using automatically configured LocalTunnel URL.' });
    } catch (error) {
        res.status(500).json({ message: 'Error during upload process', error: error.message });
    }
};

module.exports = { uploadController };
