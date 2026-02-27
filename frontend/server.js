const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>TwinGraphOps Upload</title>
        <style>
          :root {
            color-scheme: light;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            min-height: 100vh;
            font-family: Arial, Helvetica, sans-serif;
            background: #f5f7fb;
            color: #1f2937;
            display: grid;
            place-items: center;
            padding: 24px;
          }

          .card {
            width: min(560px, 100%);
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
            padding: 28px;
            text-align: center;
          }

          h1 {
            margin: 0 0 12px;
            font-size: 2rem;
            line-height: 1.2;
          }

          p {
            margin: 0 0 22px;
            color: #4b5563;
          }

          .upload-label {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            border: 2px dashed #9ca3af;
            border-radius: 12px;
            padding: 14px 20px;
            cursor: pointer;
            user-select: none;
            transition: border-color 0.2s, background-color 0.2s;
          }

          .upload-label:hover {
            border-color: #2563eb;
            background: #eff6ff;
          }

          .plus {
            display: inline-grid;
            place-items: center;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: #2563eb;
            color: #ffffff;
            font-size: 1.5rem;
            line-height: 1;
          }

          input[type="file"] {
            display: none;
          }

          #file-count {
            margin-top: 14px;
            font-size: 0.95rem;
            color: #374151;
          }

          #error {
            margin-top: 8px;
            min-height: 1.2em;
            color: #dc2626;
            font-size: 0.9rem;
          }
        </style>
      </head>
      <body>
        <main class="card">
          <h1>TwinGraphOps</h1>
          <p>Please add your documentations (up to 5 files).</p>

          <label class="upload-label" for="file-upload">
            <span class="plus">+</span>
            <span>Choose files</span>
          </label>
          <input id="file-upload" type="file" multiple />

          <div id="file-count">No files selected.</div>
          <div id="error"></div>
        </main>

        <script>
          const fileInput = document.getElementById('file-upload');
          const fileCount = document.getElementById('file-count');
          const error = document.getElementById('error');

          fileInput.addEventListener('change', () => {
            const files = Array.from(fileInput.files || []);

            if (files.length > 5) {
              error.textContent = 'You can upload a maximum of 5 files.';
              fileInput.value = '';
              fileCount.textContent = 'No files selected.';
              return;
            }

            error.textContent = '';
            fileCount.textContent =
              files.length === 0
                ? 'No files selected.'
                : files.length === 1
                  ? '1 file selected.'
                  : files.length + ' files selected.';
          });
        </script>
      </body>
    </html>
  `);
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Frontend running on port 3000');
});
