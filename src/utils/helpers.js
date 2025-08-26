const fs = require('fs');
const path = require('path');

const createOutputDirectory = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

const cleanupFiles = (files) => {
    files.forEach(file => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    });
};

module.exports = {
    createOutputDirectory,
    cleanupFiles,
};
