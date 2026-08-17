if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
  .then(() => console.log('Service Worker Registered'));
}

let imageList = [];

const grid = document.getElementById('previewGrid');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const themeBtn = document.getElementById('themeBtn');

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => addFiles(e.target.files));
themeBtn.addEventListener('click', toggleTheme);
clearBtn.addEventListener('click', clearAll);
convertBtn.addEventListener('click', generatePDF);

['dragenter', 'dragover'].forEach(name => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(name => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  });
});

dropZone.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

new Sortable(grid, {
  animation: 150,
  onEnd: () => updateListOrder()
});

function updateListOrder() {
  const newOrder = [];
  document.querySelectorAll('.img-box').forEach(box => {
    const id = box.getAttribute('data-id');
    const item = imageList.find(img => img.id == id);
    if (item) newOrder.push(item);
  });
  imageList = newOrder;
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const target = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', target);
  themeBtn.innerText = target === 'dark' ? '☀️ Light' : '🌙 Dark';
}

function addFiles(files) {
  Array.from(files).forEach(file => {
    if (file.type.startsWith('image/')) {
      imageList.push({
        id: Date.now() + Math.random(),
        file: file,
        url: URL.createObjectURL(file)
      });
    }
  });
  renderPreview();
}

function renderPreview() {
  grid.innerHTML = '';
  imageList.forEach(item => {
    const div = document.createElement('div');
    div.className = 'img-box';
    div.setAttribute('data-id', item.id);
    div.innerHTML = `
      <img src="${item.url}" alt="preview">
      <button class="remove-btn" onclick="removeImg('${item.id}')">✕</button>
    `;
    grid.appendChild(div);
  });

  const hasImages = imageList.length > 0;
  convertBtn.disabled = !hasImages;
  clearBtn.disabled = !hasImages;
}

function removeImg(id) {
  imageList = imageList.filter(item => item.id != id);
  renderPreview();
}

function clearAll() {
  imageList = [];
  renderPreview();
}

async function generatePDF() {
  convertBtn.disabled = true;
  convertBtn.innerText = "Processing...";

  try {
    const { jsPDF } = window.jspdf;
    
    // Inputs se values get karein
    const userOrientation = document.getElementById('pageOrientation') ? document.getElementById('pageOrientation').value : 'auto';
    const margin = document.getElementById('pageMargin') ? parseInt(document.getElementById('pageMargin').value) : 10;
    const password = document.getElementById('pdfPassword') ? document.getElementById('pdfPassword').value.trim() : '';
    
    let fileNameInput = document.getElementById('fileName') || document.getElementById('pdfFileName');
    let fileName = fileNameInput ? fileNameInput.value.trim() : 'converted';
    if (!fileName) fileName = 'converted';
    if (!fileName.endsWith('.pdf')) fileName += '.pdf';

    let doc = null;

    for (let i = 0; i < imageList.length; i++) {
      const img = await new Promise((resolve, reject) => {
        const imageElement = new Image();
        imageElement.onload = () => resolve(imageElement);
        imageElement.onerror = reject;
        imageElement.src = imageList[i].url;
      });

      // User Orientation select karein ya Auto-detect karein
      let orientation = userOrientation;
      if (userOrientation === 'auto') {
        const isLandscape = img.naturalWidth > img.naturalHeight;
        orientation = isLandscape ? 'l' : 'p';
      }

      // PDF options setup (Password include karke)
      const pdfOptions = {
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
      };

      if (password !== "") {
        pdfOptions.encryption = {
          userPassword: password,
          ownerPassword: password,
          userPermissions: ['print', 'modify', 'copy']
        };
      }

      if (i === 0) {
        doc = new jsPDF(pdfOptions);
      } else {
        doc.addPage('a4', orientation);
      }

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxW = pageWidth - (margin * 2);
      const maxH = pageHeight - (margin * 2);

      let finalW = maxW;
      let finalH = (img.naturalHeight * maxW) / img.naturalWidth;

      if (finalH > maxH) {
        finalH = maxH;
        finalW = (img.naturalWidth * maxH) / img.naturalHeight;
      }

      const xOffset = margin + (maxW - finalW) / 2;
      const yOffset = margin + (maxH - finalH) / 2;

      doc.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', xOffset, yOffset, finalW, finalH);
    }

    if (doc) {
      doc.save(fileName);
    }
  } catch (error) {
    alert("Error generating PDF: " + error.message);
  } finally {
    convertBtn.disabled = false;
    convertBtn.innerText = "Convert to PDF";
  }
}
