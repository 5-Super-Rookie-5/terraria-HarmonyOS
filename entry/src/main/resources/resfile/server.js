const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const server = http.createServer((req, res) => {
    console.log(`📥 ${req.method} ${req.url}`);
    
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }
    
    // Get file extension
    const ext = path.extname(filePath).toLowerCase();
    
    // Set correct Content-Type based on extension
    let contentType = 'text/html';
    
    if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
        contentType = 'application/javascript';
        console.log(`✅ Serving ${req.url} as JavaScript`);
    } else if (ext === '.css') {
        contentType = 'text/css';
    } else if (ext === '.wasm') {
        contentType = 'application/wasm';
    } else if (ext === '.json') {
        contentType = 'application/json';
    } else if (ext === '.png') {
        contentType = 'image/png';
    } else if (ext === '.jpg' || ext === '.jpeg') {
        contentType = 'image/jpeg';
    } else if (ext === '.ico') {
        contentType = 'image/x-icon';
    } else if (ext === '.svg') {
        contentType = 'image/svg+xml';
    } else if (ext === '.dat' || ext === '.dll' || ext === '.pdb') {
        contentType = 'application/octet-stream';
    }
    
    res.setHeader('Content-Type', contentType);
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                console.log(`❌ ${req.url} not found, serving index.html`);
                // File not found - serve index.html for SPA
                fs.readFile('./index.html', (err2, content2) => {
                    if (err2) {
                        res.writeHead(404);
                        res.end('404 Not Found');
                    } else {
                        res.writeHead(200, { 
                            'Content-Type': 'text/html',
                            'Cross-Origin-Opener-Policy': 'same-origin',
                            'Cross-Origin-Embedder-Policy': 'require-corp'
                        });
                        res.end(content2, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + err.code);
            }
        } else {
            res.writeHead(200);
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`🚀 .NET WASM SERVER STARTED`);
    console.log(`🚀 http://localhost:${PORT}`);
    console.log('='.repeat(50));
    console.log('✅ .mjs files will be served correctly');
    console.log('✅ COOP/COEP headers enabled');
    console.log('✅ SharedArrayBuffer should work');
    console.log('='.repeat(50));
    
    const { exec } = require('child_process');
    exec(`start http://localhost:${PORT}`, () => {});
});