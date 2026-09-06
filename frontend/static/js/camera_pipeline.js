const CameraPipeline = {
  /**
   * Compresses image on the client side using HTML5 Canvas
   * to ensure under 150KB size for 2G/3G entry-level mobile devices.
   */
  async compressImageFile(file, maxWidth = 800, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = (e) => reject(e);
        img.src = event.target.result;
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }
};

window.CameraPipeline = CameraPipeline;
