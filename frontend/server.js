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

          #file-list {
            list-style: none;
            margin: 14px 0 0;
            padding: 0;
            text-align: left;
            display: grid;
            gap: 8px;
          }

          .file-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 8px 10px;
            background: #f9fafb;
          }

          .file-name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .remove-file {
            border: none;
            background: transparent;
            color: #6b7280;
            font-size: 1.1rem;
            line-height: 1;
            cursor: pointer;
            padding: 2px;
          }

          .remove-file:hover {
            color: #dc2626;
          }

          .upload-action {
            margin-top: 18px;
            width: 100%;
            border: none;
            border-radius: 10px;
            background: #2563eb;
            color: #ffffff;
            padding: 12px 16px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: not-allowed;
            opacity: 0.85;
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
          <ul id="file-list"></ul>

          <button class="upload-action" type="button" aria-disabled="true">↑ Upload</button>
          <div id="error"></div>
        </main>

        <script>
          const fileInput = document.getElementById('file-upload');
          const fileCount = document.getElementById('file-count');
          const fileList = document.getElementById('file-list');
          const error = document.getElementById('error');
          let selectedFiles = [];

          function syncInputFiles() {
            const dataTransfer = new DataTransfer();
            selectedFiles.forEach((file) => dataTransfer.items.add(file));
            fileInput.files = dataTransfer.files;
          }

          function updateFileCount() {
            fileCount.textContent =
              selectedFiles.length === 0
                ? 'No files selected.'
                : selectedFiles.length === 1
                  ? '1 file selected.'
                  : selectedFiles.length + ' files selected.';
          }

          function renderFileList() {
            fileList.innerHTML = '';

            selectedFiles.forEach((file, index) => {
              const item = document.createElement('li');
              item.className = 'file-item';

              const name = document.createElement('span');
              name.className = 'file-name';
              name.textContent = file.name;

              const remove = document.createElement('button');
              remove.type = 'button';
              remove.className = 'remove-file';
              remove.setAttribute('aria-label', 'Remove ' + file.name);
              remove.textContent = '✕';
              remove.addEventListener('click', () => {
                selectedFiles.splice(index, 1);
                syncInputFiles();
                updateFileCount();
                renderFileList();
              });

              item.appendChild(name);
              item.appendChild(remove);
              fileList.appendChild(item);
            });
          }

          fileInput.addEventListener('change', () => {
            const files = Array.from(fileInput.files || []);

            if (files.length > 5) {
              error.textContent = 'You can upload a maximum of 5 files.';
              fileInput.value = '';
              selectedFiles = [];
              fileCount.textContent = 'No files selected.';
              fileList.innerHTML = '';
              return;
            }

            error.textContent = '';
            selectedFiles = files;
            updateFileCount();
            renderFileList();
          });
        </script>
      </body>
    </html>
  `);
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Frontend running on port 3000');
});
