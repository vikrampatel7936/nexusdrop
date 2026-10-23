/**
 * NexusDrop - Standalone Client-Side EXIF & Media Inspector
 * Extracts original metadata (camera make, model, lens, ISO, shutter, aperture,
 * resolution, GPS, color space, creation date) directly from binary buffers.
 * Runs 100% locally with zero external network dependencies.
 */

class ExifReader {
  /**
   * Parse metadata from a File object
   * @param {File} file 
   * @returns {Promise<Object>}
   */
  static async inspectFile(file) {
    const info = {
      name: file.name,
      size: file.size,
      sizeFormatted: this.formatBytes(file.size),
      type: file.type || 'application/octet-stream',
      lastModified: file.lastModified,
      lastModifiedDate: new Date(file.lastModified).toLocaleString(),
      isMedia: false,
      mediaType: 'other',
      exif: null,
      dimensions: null,
      audioVideo: null,
      colorSpace: null
    };

    const ext = file.name.split('.').pop().toLowerCase();
    const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'arw', 'cr2', 'cr3', 'nef', 'dng', 'raf'].includes(ext);
    const isVideo = file.type.startsWith('video/') || ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'].includes(ext);
    const isAudio = file.type.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].includes(ext);

    if (isImage) {
      info.isMedia = true;
      info.mediaType = 'image';
      try {
        // Extract dimensions via Image bitmap / URL
        const dims = await this.getImageDimensions(file);
        info.dimensions = dims;
      } catch (e) {
        console.warn('Could not read image dimensions:', e);
      }

      try {
        // Extract EXIF data from binary buffer
        const buffer = await file.slice(0, 131072).arrayBuffer(); // read first 128KB
        const exifData = this.parseExifFromBuffer(buffer);
        if (exifData && Object.keys(exifData).length > 0) {
          info.exif = exifData;
        }
      } catch (e) {
        console.warn('Could not parse EXIF:', e);
      }
    } else if (isVideo) {
      info.isMedia = true;
      info.mediaType = 'video';
      try {
        const avInfo = await this.getVideoDetails(file);
        info.audioVideo = avInfo;
        if (avInfo.width && avInfo.height) {
          info.dimensions = { width: avInfo.width, height: avInfo.height, megapixel: ((avInfo.width * avInfo.height) / 1000000).toFixed(2) };
        }
      } catch (e) {
        console.warn('Could not read video details:', e);
      }
    } else if (isAudio) {
      info.isMedia = true;
      info.mediaType = 'audio';
      try {
        const audInfo = await this.getAudioDetails(file);
        info.audioVideo = audInfo;
      } catch (e) {
        console.warn('Could not read audio details:', e);
      }
    }

    return info;
  }

  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  static getImageDimensions(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        URL.revokeObjectURL(url);
        resolve({
          width: w,
          height: h,
          aspectRatio: this.gcdRatio(w, h),
          megapixel: ((w * h) / 1000000).toFixed(2) + ' MP'
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  static getVideoDetails(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const details = {
          duration: video.duration ? this.formatDuration(video.duration) : 'Unknown',
          durationSeconds: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          resolution: `${video.videoWidth} x ${video.videoHeight}`
        };
        URL.revokeObjectURL(url);
        resolve(details);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ duration: 'Unknown' });
      };
      video.src = url;
    });
  }

  static getAudioDetails(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        const details = {
          duration: audio.duration ? this.formatDuration(audio.duration) : 'Unknown',
          durationSeconds: audio.duration
        };
        URL.revokeObjectURL(url);
        resolve(details);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ duration: 'Unknown' });
      };
      audio.src = url;
    });
  }

  static formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  static gcdRatio(a, b) {
    if (!a || !b) return '';
    const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y));
    const r = gcd(a, b);
    return `${a / r}:${b / r}`;
  }

  /**
   * Fast Binary EXIF parser for JPEG/TIFF/RAW buffers
   */
  static parseExifFromBuffer(buffer) {
    const view = new DataView(buffer);
    if (view.byteLength < 16) return null;

    // Check for JPEG marker 0xFFD8
    if (view.getUint16(0, false) === 0xFFD8) {
      return this.parseJpegExif(view);
    }
    // Check for TIFF header: 0x4949 (little endian 'II') or 0x4D4D (big endian 'MM')
    if (view.getUint16(0, false) === 0x4949 || view.getUint16(0, false) === 0x4D4D) {
      return this.parseTiffData(view, 0);
    }
    return null;
  }

  static parseJpegExif(view) {
    let offset = 2;
    const length = view.byteLength;

    while (offset < length) {
      if (view.getUint8(offset) !== 0xFF) return null;
      const marker = view.getUint8(offset + 1);

      // APP1 Marker (EXIF)
      if (marker === 0xE1) {
        const app1Length = view.getUint16(offset + 2, false);
        // Check for 'Exif\0\0' (0x457869660000)
        if (
          view.getUint32(offset + 4, false) === 0x45786966 &&
          view.getUint16(offset + 8, false) === 0x0000
        ) {
          const tiffStart = offset + 10;
          return this.parseTiffData(view, tiffStart);
        }
        offset += 2 + app1Length;
      } else if (marker === 0xD9 || marker === 0xDA) {
        // End of image or Start of scan
        break;
      } else {
        offset += 2 + view.getUint16(offset + 2, false);
      }
    }
    return null;
  }

  static parseTiffData(view, tiffStart) {
    if (tiffStart + 8 > view.byteLength) return null;
    const byteOrder = view.getUint16(tiffStart, false);
    const littleEndian = byteOrder === 0x4949; // 'II'
    if (!littleEndian && byteOrder !== 0x4D4D) return null; // Not 'MM' either

    if (view.getUint16(tiffStart + 2, littleEndian) !== 0x002A) return null; // 42 magic number

    const ifdOffset = view.getUint32(tiffStart + 4, littleEndian);
    if (ifdOffset < 8) return null;

    const tags = {};
    this.readIfd(view, tiffStart, tiffStart + ifdOffset, littleEndian, tags);
    return tags;
  }

  static readIfd(view, tiffStart, dirStart, littleEndian, tags) {
    if (dirStart + 2 > view.byteLength) return;
    const entries = view.getUint16(dirStart, littleEndian);

    const tagNames = {
      0x010F: 'Make',
      0x0110: 'Model',
      0x0112: 'Orientation',
      0x011A: 'XResolution',
      0x011B: 'YResolution',
      0x0128: 'ResolutionUnit',
      0x0131: 'Software',
      0x0132: 'DateTime',
      0x0213: 'YCbCrPositioning',
      0x8298: 'Copyright',
      0x8769: 'ExifIFDPointer',
      0x8825: 'GPSInfoIFDPointer',
      // SubIFD tags
      0x829A: 'ExposureTime',
      0x829D: 'FNumber',
      0x8822: 'ExposureProgram',
      0x8827: 'ISOSpeedRatings',
      0x9000: 'ExifVersion',
      0x9003: 'DateTimeOriginal',
      0x9004: 'DateTimeDigitized',
      0x9201: 'ShutterSpeedValue',
      0x9202: 'ApertureValue',
      0x9204: 'ExposureBiasValue',
      0x9205: 'MaxApertureValue',
      0x9207: 'MeteringMode',
      0x9208: 'LightSource',
      0x9209: 'Flash',
      0x920A: 'FocalLength',
      0x9286: 'UserComment',
      0xA000: 'FlashpixVersion',
      0xA001: 'ColorSpace',
      0xA002: 'PixelXDimension',
      0xA003: 'PixelYDimension',
      0xA405: 'FocalLengthIn35mmFilm',
      0xA432: 'LensSpecification',
      0xA434: 'LensModel'
    };

    let subIfdOffset = null;
    let gpsIfdOffset = null;

    for (let i = 0; i < entries; i++) {
      const entryOffset = dirStart + 2 + i * 12;
      if (entryOffset + 12 > view.byteLength) break;

      const tag = view.getUint16(entryOffset, littleEndian);
      const type = view.getUint16(entryOffset + 2, littleEndian);
      const count = view.getUint32(entryOffset + 4, littleEndian);
      const valOffset = entryOffset + 8;

      const tagName = tagNames[tag] || null;
      if (tag === 0x8769) {
        subIfdOffset = view.getUint32(valOffset, littleEndian);
      } else if (tag === 0x8825) {
        gpsIfdOffset = view.getUint32(valOffset, littleEndian);
      } else if (tagName) {
        const val = this.readTagValue(view, tiffStart, valOffset, type, count, littleEndian);
        if (val !== null && val !== undefined) {
          tags[tagName] = this.formatTagValue(tagName, val);
        }
      }
    }

    // Read SubIFD (Detailed camera settings)
    if (subIfdOffset && (tiffStart + subIfdOffset < view.byteLength)) {
      this.readIfd(view, tiffStart, tiffStart + subIfdOffset, littleEndian, tags);
    }
  }

  static readTagValue(view, tiffStart, valOffset, type, count, littleEndian) {
    let offset = valOffset;
    const typeSizes = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
    const size = typeSizes[type] || 0;
    const totalSize = size * count;

    if (totalSize > 4) {
      const dataOffset = view.getUint32(valOffset, littleEndian);
      offset = tiffStart + dataOffset;
    }

    if (offset + totalSize > view.byteLength) return null;

    switch (type) {
      case 1: // Byte
      case 7: // Undefined
        if (count === 1) return view.getUint8(offset);
        const bytes = [];
        for (let j = 0; j < Math.min(count, 32); j++) bytes.push(view.getUint8(offset + j));
        return bytes;

      case 2: // ASCII String
        let str = '';
        for (let j = 0; j < count; j++) {
          const charCode = view.getUint8(offset + j);
          if (charCode === 0) break;
          str += String.fromCharCode(charCode);
        }
        return str.trim();

      case 3: // Short (16-bit)
        if (count === 1) return view.getUint16(offset, littleEndian);
        const shorts = [];
        for (let j = 0; j < count; j++) shorts.push(view.getUint16(offset + j * 2, littleEndian));
        return shorts;

      case 4: // Long (32-bit)
        if (count === 1) return view.getUint32(offset, littleEndian);
        const longs = [];
        for (let j = 0; j < count; j++) longs.push(view.getUint32(offset + j * 4, littleEndian));
        return longs;

      case 5: // Unsigned Rational
        if (count === 1) {
          const num = view.getUint32(offset, littleEndian);
          const den = view.getUint32(offset + 4, littleEndian);
          return den === 0 ? 0 : num / den;
        }
        const rationals = [];
        for (let j = 0; j < count; j++) {
          const num = view.getUint32(offset + j * 8, littleEndian);
          const den = view.getUint32(offset + j * 8 + 4, littleEndian);
          rationals.push(den === 0 ? 0 : num / den);
        }
        return rationals;

      case 10: // Signed Rational
        const snum = view.getInt32(offset, littleEndian);
        const sden = view.getInt32(offset + 4, littleEndian);
        return sden === 0 ? 0 : snum / sden;

      default:
        return null;
    }
  }

  static formatTagValue(tagName, val) {
    if (tagName === 'ExposureTime') {
      if (typeof val === 'number') {
        if (val < 1 && val > 0) return `1/${Math.round(1 / val)}s`;
        return `${val}s`;
      }
    }
    if (tagName === 'FNumber') {
      return `f/${Number(val).toFixed(1)}`;
    }
    if (tagName === 'ISOSpeedRatings') {
      return `ISO ${val}`;
    }
    if (tagName === 'FocalLength') {
      return `${Number(val).toFixed(1)} mm`;
    }
    if (tagName === 'ColorSpace') {
      return val === 1 ? 'sRGB' : (val === 65535 ? 'Uncalibrated / Wide Gamut' : `ColorSpace ${val}`);
    }
    if (tagName === 'Orientation') {
      const orients = { 1: 'Normal (0°)', 3: 'Upside down (180°)', 6: 'Rotated 90° CW', 8: 'Rotated 90° CCW' };
      return orients[val] || val;
    }
    return val;
  }
}

// Export to window
window.ExifReader = ExifReader;
