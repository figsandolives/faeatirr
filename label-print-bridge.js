(function () {
  const REQUEST_PATH = 'labelPrintRequests';

  if (window.__labelPrintBridgeLoaded) return;
  window.__labelPrintBridgeLoaded = true;

  const labelPrintSettings = {
    widthMm: 57,
    heightMm: 38
  };
  const ZEBRA_DPI = 203;

  function mmToDots(mm) {
    return Math.round((Number(mm) || 0) * ZEBRA_DPI / 25.4);
  }

  function getFittedFontSize(ctx, text, maxWidth, maxSize, minSize, weight = 'bold', family = 'Arial, Tahoma, sans-serif') {
    const value = String(text || '').trim();
    for (let size = maxSize; size >= minSize; size -= 1) {
      ctx.font = `${weight} ${size}px ${family}`;
      if (!value || ctx.measureText(value).width <= maxWidth) return size;
    }
    return minSize;
  }

  function drawFittedLine(ctx, text, x, y, maxWidth, options = {}) {
    const value = String(text || '').trim();
    if (!value) return;
    const {
      maxSize = 24,
      minSize = 12,
      weight = 'bold',
      family = 'Arial, Tahoma, sans-serif',
      align = 'center',
      direction = 'rtl'
    } = options;
    const size = getFittedFontSize(ctx, value, maxWidth, maxSize, minSize, weight, family);
    ctx.save();
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.fillStyle = '#000';
    ctx.textAlign = align;
    ctx.direction = direction;
    ctx.textBaseline = 'top';
    const measured = ctx.measureText(value).width;
    const scaleX = measured > maxWidth ? Math.max(0.76, maxWidth / measured) : 1;
    if (scaleX < 1) {
      ctx.translate(x, y);
      ctx.scale(scaleX, 1);
      ctx.fillText(value, 0, 0);
    } else {
      ctx.fillText(value, x, y);
    }
    ctx.restore();
  }

  function wrapTextLines(ctx, text, maxWidth) {
    const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !line) {
        line = next;
      } else {
        lines.push(line);
        line = word;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function drawWrappedFittedText(ctx, text, x, y, maxWidth, maxLines, options = {}) {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    if (!value) return;
    const {
      maxSize = 18,
      minSize = 11,
      weight = 'bold',
      family = 'Arial, Tahoma, sans-serif',
      align = 'right',
      direction = 'rtl',
      lineGap = 3
    } = options;
    let selectedSize = minSize;
    let selectedLines = [];
    for (let size = maxSize; size >= minSize; size -= 1) {
      ctx.font = `${weight} ${size}px ${family}`;
      const lines = wrapTextLines(ctx, value, maxWidth);
      if (lines.length <= maxLines) {
        selectedSize = size;
        selectedLines = lines;
        break;
      }
      if (size === minSize) selectedLines = lines.slice(0, maxLines);
    }
    ctx.save();
    ctx.font = `${weight} ${selectedSize}px ${family}`;
    ctx.fillStyle = '#000';
    ctx.textAlign = align;
    ctx.direction = direction;
    ctx.textBaseline = 'top';
    const lineHeight = selectedSize + lineGap;
    selectedLines.slice(0, maxLines).forEach((line, index) => {
      const measured = ctx.measureText(line).width;
      const scaleX = measured > maxWidth ? Math.max(0.76, maxWidth / measured) : 1;
      if (scaleX < 1) {
        ctx.save();
        ctx.translate(x, y + (index * lineHeight));
        ctx.scale(scaleX, 1);
        ctx.fillText(line, 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(line, x, y + (index * lineHeight));
      }
    });
    ctx.restore();
  }

  function drawVerticalLabelBarcode(ctx, barcodeValue, x, y, maxWidth, maxHeight) {
    if (!barcodeValue || typeof JsBarcode === 'undefined') return;
    const barcodeCanvas = document.createElement('canvas');
    let moduleWidth = 2;
    JsBarcode(barcodeCanvas, barcodeValue, {
      format: 'CODE128',
      displayValue: false,
      height: maxWidth,
      width: moduleWidth,
      margin: 0
    });
    if (barcodeCanvas.width > maxHeight) {
      moduleWidth = 1;
      JsBarcode(barcodeCanvas, barcodeValue, {
        format: 'CODE128',
        displayValue: false,
        height: maxWidth,
        width: moduleWidth,
        margin: 0
      });
    }
    const drawHeight = Math.min(barcodeCanvas.width, maxHeight);
    const drawWidth = Math.min(barcodeCanvas.height, maxWidth);
    const drawY = y + Math.max(0, Math.floor((maxHeight - drawHeight) / 2));
    const drawX = x + Math.max(0, Math.floor((maxWidth - drawWidth) / 2));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(drawX, drawY + drawHeight);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(barcodeCanvas, 0, 0, barcodeCanvas.width, barcodeCanvas.height, 0, 0, drawHeight, drawWidth);
    ctx.restore();
  }

  function canvasToMonoGfa(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    const image = ctx.getImageData(0, 0, width, height).data;
    const rowBytes = Math.ceil(width / 8);
    let hex = '';
    for (let y = 0; y < height; y += 1) {
      for (let byteX = 0; byteX < rowBytes; byteX += 1) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit += 1) {
          const x = byteX * 8 + bit;
          if (x >= width) continue;
          const idx = (y * width + x) * 4;
          const alpha = image[idx + 3];
          const luminance = (image[idx] * 0.299) + (image[idx + 1] * 0.587) + (image[idx + 2] * 0.114);
          if (alpha > 32 && luminance < 160) byte |= (0x80 >> bit);
        }
        hex += byte.toString(16).padStart(2, '0').toUpperCase();
      }
    }
    const totalBytes = rowBytes * height;
    return { hex, totalBytes, rowBytes };
  }

  async function buildProductionLabelBitmapZpl(item) {
    const barcodeValue = item.barcode || item.productionBarcode || '';
    const canvas = document.createElement('canvas');
    canvas.width = mmToDots(labelPrintSettings.widthMm);
    canvas.height = mmToDots(labelPrintSettings.heightMm);
    const ctx = canvas.getContext('2d');

    if (document.fonts?.ready) {
      try { await document.fonts.ready; } catch (_) {}
    }

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

    const nameAr = item.nameAr || item.itemName || '';
    const nameEn = item.nameEn || '';
    const ingredients = item.ingredients || '-';
    const origin = item.origin || '-';
    const productionDate = item.productionDate || '-';
    const expiryDate = item.expiryDate || '-';

    ctx.fillStyle = '#000';
    ctx.textBaseline = 'top';

    const barcodeBox = {
      x: 16,
      y: 28,
      width: 96,
      height: canvas.height - 56
    };
    drawVerticalLabelBarcode(ctx, barcodeValue, barcodeBox.x, barcodeBox.y, barcodeBox.width, barcodeBox.height);

    const contentLeft = barcodeBox.x + barcodeBox.width + 12;
    const contentRight = canvas.width - 18;
    const contentWidth = contentRight - contentLeft;
    const centerX = contentLeft + (contentWidth / 2);

    drawFittedLine(ctx, nameAr, centerX, 22, contentWidth, {
      maxSize: 31,
      minSize: 17,
      align: 'center',
      direction: 'rtl'
    });
    drawFittedLine(ctx, nameEn, centerX, 57, contentWidth, {
      maxSize: 24,
      minSize: 13,
      align: 'center',
      direction: 'ltr',
      family: 'Arial, sans-serif'
    });
    drawWrappedFittedText(ctx, `المكونات: ${ingredients}`, contentRight, 93, contentWidth, 3, {
      maxSize: 18,
      minSize: 11,
      align: 'right',
      direction: 'rtl',
      lineGap: 3
    });

    const metaTop = 212;
    const columns = [
      { label: 'إنتاج', value: productionDate, x: contentRight - 48, width: 96, direction: 'ltr' },
      { label: 'انتهاء', value: expiryDate, x: contentRight - 150, width: 96, direction: 'ltr' },
      { label: 'بلد المنشأ', value: origin, x: contentLeft + 42, width: 100, direction: 'rtl' }
    ];
    columns.forEach((entry) => {
      drawFittedLine(ctx, entry.label, entry.x, metaTop, entry.width, {
        maxSize: 20,
        minSize: 14,
        align: 'center',
        direction: 'rtl'
      });
      drawFittedLine(ctx, entry.value, entry.x, metaTop + 30, entry.width, {
        maxSize: 21,
        minSize: 13,
        align: 'center',
        direction: entry.direction,
        family: 'Arial, Tahoma, sans-serif'
      });
    });

    const { hex, totalBytes, rowBytes } = canvasToMonoGfa(canvas);
    const copies = Math.max(1, Math.floor(Number(item.quantity || 1)));
    return [
      '^XA',
      `^PW${canvas.width}`,
      `^LL${canvas.height}`,
      '^LH0,0',
      '^PR4',
      '^MD24',
      `^FO0,0^GFA,${totalBytes},${totalBytes},${rowBytes},${hex}^FS`,
      `^PQ${copies}`,
      '^XZ'
    ].join('\n');
  }

  async function loadAuthoritativeLabelItem(item) {
    if (!item?.productId || !window.firebase?.database) return item;
    try {
      const productSnap = await firebase.database().ref(`products/${item.productId}`).once('value');
      const infoSnap = await firebase.database().ref(`productInfos/${item.productId}`).once('value');
      const product = productSnap.val() || {};
      const info = infoSnap.val() || {};
      let origin = info.origin || item.origin || '';
      if (!origin && product.countryOriginId) {
        const originSnap = await firebase.database().ref(`countryOrigins/${product.countryOriginId}`).once('value');
        const originRow = originSnap.val() || {};
        origin = originRow.nameAr || originRow.nameEn || originRow.name || '';
      }
      return {
        ...item,
        nameAr: product.nameAr || item.nameAr || '',
        nameEn: product.nameEn || item.nameEn || '',
        ingredients: info.ingredients || item.ingredients || '',
        origin,
        barcode: info.barcode || product.barcode || item.barcode || ''
      };
    } catch (error) {
      console.warn('Could not load authoritative product label data:', error);
      return item;
    }
  }

  async function printRequest(requestId, request) {
    if (!window.figsDesktop?.isDesktopApp || !window.figsDesktop?.printZpl) {
      throw new Error('Desktop printer bridge is not available.');
    }
    if (typeof JsBarcode === 'undefined') {
      throw new Error('Barcode library is not loaded.');
    }
    const items = Array.isArray(request.items) ? request.items : Object.values(request.items || {});
    if (!items.length) throw new Error('No stickers in request.');
    for (const item of items) {
      const labelItem = await loadAuthoritativeLabelItem(item);
      const zpl = await buildProductionLabelBitmapZpl(labelItem);
      await window.figsDesktop.printZpl({ zpl });
    }
    await firebase.database().ref(`${REQUEST_PATH}/${requestId}`).update({
      status: 'completed',
      printedAt: firebase.database.ServerValue.TIMESTAMP,
      printedByDeviceId: localStorage.getItem('deviceId') || ''
    });
  }

  window.labelPrintBridge = {
    buildProductionLabelBitmapZpl,
    printRequest
  };
})();
