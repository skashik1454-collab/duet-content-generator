/**
 * PNG Exporter Service
 * ====================
 * Uses html2canvas to render DOM nodes into high-quality PNGs.
 * Specifically handles the off-screen render container to ensure
 * exports are full-size and not bound by the UI preview scaling.
 */

import html2canvas from 'html2canvas';

export class PngExporter {
  /**
   * Export a DOM node to a PNG Blob.
   * @param {HTMLElement} element - The DOM node to render
   * @param {number} [scale=2] - Scaling factor for high-DPI export
   * @returns {Promise<Blob>}
   */
  async exportNodeToBlob(element, scale = 2) {
    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      backgroundColor: null, // preserve transparency if any
      logging: false,
      // Ensure text is rendered sharply by disabling subpixel AA if possible
      textRendering: 'geometricPrecision',
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas export failed: Blob is null.'));
        },
        'image/png',
        1.0 // max quality
      );
    });
  }

  /**
   * Download a Blob as a file.
   * @param {Blob} blob
   * @param {string} filename
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
