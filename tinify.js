const tinify = require('tinify');
const apiKey = require('./api_key');
const fs = require('fs');
const path = require('path');

tinify.key = apiKey;

const task = file => {
    const source = tinify.fromFile(file.fromFile);
    source.toFile(file.toFile);
    return source._url;
}

const fromDir = (inDir, outDir, _files = []) => {
    const files = fs.readdirSync(inDir);
    for (let file of files) {
        const filePath = `${inDir}/${file}`;
        const toFilePath = `${outDir}/${file}`;
        if (fs.statSync(filePath).isDirectory()) {
            fromDir(filePath, toFilePath, _files)
        } else {
            try {
                fs.accessSync(toFilePath);
            } catch (err) {
                _files.push({
                    fromFile: filePath,
                    toFile: toFilePath,
                });
            }
        }
    }
    return _files;
}

const rootDir = fs.realpathSync(process.cwd());
const screenshotDir = path.resolve(rootDir, './screenshotin');
const screenshotOutDir = path.resolve(rootDir, './screenshot');

const files = fromDir(screenshotDir, screenshotOutDir);

if (files.length === 0) {
    return;
}
let current = task(files[0]);
for (let i = 1; i < files.length; i++) {
    current = current.then(task(files[i]));
}